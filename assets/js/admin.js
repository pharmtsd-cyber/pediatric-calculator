// assets/js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("智能運管後台初始化...");
    initializeAdmin();
    setupTabNavigation();
    setupEditorButtons();
    
    // 綁定三個儲存按鈕
    document.getElementById('btn-save-staff').onclick = saveStaff;
    document.getElementById('btn-save-param').onclick = saveParameter;
    document.getElementById('btn-save-formula').onclick = saveFormula;

    // 讓公式文字框每次變動時，"自動"重新產生下方測試欄位
    document.getElementById('admin-formula-string').addEventListener('input', generateTestInputs);
});

// 全域擴充後台所需的資料
STORE.staff = [];

async function initializeAdmin() {
    try {
        const [drugsData, paramsData, formulasData, staffData] = await Promise.all([
            fetchFromGAS('getDrugs'),
            fetchFromGAS('getParameters'),
            fetchFromGAS('getFormulas'),
            fetchFromGAS('getStaff')
        ]);

        if (drugsData) STORE.drugs = drugsData;
        if (paramsData) STORE.parameters = paramsData;
        if (formulasData) STORE.formulas = formulasData;
        if (staffData) STORE.staff = staffData;
        
        // 更新儀表板數據
        document.getElementById('stat-drugs').innerText = STORE.drugs.length;
        document.getElementById('stat-formulas').innerText = STORE.formulas.length;
        document.getElementById('stat-staff').innerText = STORE.staff.length;

        renderDrugSelect();
        renderParameterPad();
    } catch (error) {
        console.error("後台載入錯誤:", error);
    }
}

// 側邊導覽列切換邏輯
function setupTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // 移除所有 active
            navItems.forEach(n => n.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            
            // 加上當前 active
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// ==========================================
// 防重複檢查與儲存：藥師
// ==========================================
async function saveStaff() {
    const empId = document.getElementById('staff-id').value.trim();
    const name = document.getElementById('staff-name').value.trim();
    const role = document.getElementById('staff-role').value;
    const status = document.getElementById('staff-status').value;

    if (!empId || !name) return alert("員工編號與姓名為必填！");

    // 【防呆】檢查員工編號是否重複
    if (STORE.staff.some(s => String(s.emp_id) === String(empId))) {
        return alert(`錯誤：員工編號 ${empId} 已經存在，不可重複新增！`);
    }

    const payload = { action: "saveStaff", emp_id: empId, name: name, role: role, status: status };
    await sendPostToGAS(payload, 'btn-save-staff', '新增藥師成功！');
    
    // 清空並更新本機暫存
    STORE.staff.push(payload);
    document.getElementById('stat-staff').innerText = STORE.staff.length;
    document.getElementById('staff-id').value = '';
    document.getElementById('staff-name').value = '';
}

// ==========================================
// 防重複檢查與儲存：參數
// ==========================================
async function saveParameter() {
    const code = document.getElementById('param-code').value.trim();
    const name = document.getElementById('param-name').value.trim();
    const unit = document.getElementById('param-unit').value.trim();
    const altUnit = document.getElementById('param-alt-unit').value.trim();
    const rate = document.getElementById('param-rate').value.trim();

    if (!code || !name || !unit) return alert("代碼、名稱、預設單位為必填！");
    if (!/^[a-zA-Z0-9_]+$/.test(code)) return alert("參數代碼僅限使用英文、數字與底線！");

    // 【防呆】檢查參數代碼是否重複
    if (STORE.parameters.some(p => p.param_code === code)) {
        return alert(`錯誤：參數代碼 '${code}' 已經存在！`);
    }

    const payload = { action: "saveParameter", param_code: code, param_name: name, default_unit: unit, alt_unit: altUnit, conversion_rate: rate };
    await sendPostToGAS(payload, 'btn-save-param', '新增參數成功！');
    
    STORE.parameters.push(payload);
    renderParameterPad(); // 重新渲染編輯器的按鈕
    document.getElementById('param-code').value = '';
    document.getElementById('param-name').value = '';
}

// ==========================================
// 視覺化公式編輯器相關邏輯 (完美支援多參數)
// ==========================================

function renderDrugSelect() {
    const select = document.getElementById('admin-drug-select');
    select.innerHTML = '<option value="">-- 請選擇藥品 --</option>';
    STORE.drugs.forEach(drug => {
        const option = document.createElement('option');
        option.value = drug.drug_id;
        option.innerText = `${drug.local_name || drug.brand_name}`;
        select.appendChild(option);
    });
}

function renderParameterPad() {
    const pad = document.getElementById('admin-param-pad');
    pad.innerHTML = '';
    STORE.parameters.forEach(param => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'text-xs bg-[#1B365D] text-white px-2 py-1.5 rounded hover:bg-blue-800 transition shadow-sm';
        btn.innerText = `${param.param_name} {${param.param_code}}`;
        btn.onclick = () => {
            insertAtCursor(`{${param.param_code}}`);
            generateTestInputs(); // 插入參數後自動觸發測試欄位更新
        };
        pad.appendChild(btn);
    });
}

function setupEditorButtons() {
    document.querySelectorAll('.op-btn').forEach(btn => {
        btn.onclick = (e) => {
            insertAtCursor(` ${e.target.innerText} `);
            generateTestInputs();
        };
    });
}

function insertAtCursor(textToInsert) {
    const textarea = document.getElementById('admin-formula-string');
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;
    textarea.value = text.substring(0, startPos) + textToInsert + text.substring(endPos);
    textarea.selectionStart = textarea.selectionEnd = startPos + textToInsert.length;
    textarea.focus();
}

// ⭐ 多參數動態擷取與測試修正 ⭐
function generateTestInputs() {
    const formulaStr = document.getElementById('admin-formula-string').value;
    const testContainer = document.getElementById('admin-test-inputs');
    
    // 利用 Set 物件確保即使同一個參數寫了兩次 (例: {weight}*15/{weight})，也只會抓出一個唯一值
    const paramRegex = /{([^}]+)}/g;
    const uniqueCodes = new Set();
    let match;
    while ((match = paramRegex.exec(formulaStr)) !== null) {
        uniqueCodes.add(match[1]);
    }

    if (uniqueCodes.size === 0) {
        testContainer.innerHTML = '<span class="text-xs text-gray-500 italic col-span-full">尚無偵測到參數。請點擊左側參數按鈕加入公式。</span>';
        document.getElementById('admin-test-result').innerText = '--';
        return;
    }

    // 為了保留已經輸入的測試數字，我們先把舊的數值記下來
    const oldValues = {};
    document.querySelectorAll('.test-input').forEach(input => {
        oldValues[input.getAttribute('data-testcode')] = input.value;
    });

    testContainer.innerHTML = '';
    
    uniqueCodes.forEach(code => {
        // 從資料庫找中文名稱，若無則顯示代碼
        const paramDef = STORE.parameters.find(p => p.param_code === code);
        const displayName = paramDef ? paramDef.param_name : code;

        const div = document.createElement('div');
        div.innerHTML = `
            <label class="block text-xs font-bold text-gray-600 mb-1">${displayName} <span class="text-[10px] text-gray-400">({${code}})</span></label>
            <input type="number" data-testcode="${code}" class="test-input w-full border border-blue-300 rounded px-2 py-1.5 text-sm focus:border-[#1B365D]" placeholder="測試數字" value="${oldValues[code] || ''}">
        `;
        testContainer.appendChild(div);
    });

    // 重新綁定事件並跑一次運算
    document.querySelectorAll('.test-input').forEach(input => {
        input.addEventListener('input', runLiveTest);
    });
    runLiveTest();
}

function runLiveTest() {
    let formulaStr = document.getElementById('admin-formula-string').value;
    const inputs = document.querySelectorAll('.test-input');
    let allFilled = true;

    inputs.forEach(input => {
        const code = input.getAttribute('data-testcode');
        const val = input.value;
        if (val === '') allFilled = false;
        else {
            // ⭐ 修正替換邏輯：確保整個公式字串內所有的 {code} 都被替換
            const regex = new RegExp(`{${code}}`, 'g');
            formulaStr = formulaStr.replace(regex, val);
        }
    });

    if (!allFilled || inputs.length === 0) {
        document.getElementById('admin-test-result').innerText = '--';
        return;
    }

    try {
        let result = math.evaluate(formulaStr);
        result = Math.round(result * 100) / 100;
        document.getElementById('admin-test-result').innerText = result;
    } catch (error) {
        document.getElementById('admin-test-result').innerText = "運算錯誤(公式未完成)";
    }
}

async function saveFormula() {
    const payload = {
        action: "saveFormula",
        drug_id: document.getElementById('admin-drug-select').value,
        formula_name: document.getElementById('admin-formula-name').value.trim(),
        formula_string: document.getElementById('admin-formula-string').value.trim(),
        result_unit: document.getElementById('admin-result-unit').value.trim(),
        remark: document.getElementById('admin-remark').value.trim()
    };

    if (!payload.drug_id || !payload.formula_name || !payload.formula_string || !payload.result_unit) {
        return alert("請填寫所有帶有紅色 * 的必填欄位！");
    }

    await sendPostToGAS(payload, 'btn-save-formula', '公式已成功寫入資料庫！');
    
    STORE.formulas.push(payload);
    document.getElementById('stat-formulas').innerText = STORE.formulas.length;
    document.getElementById('admin-formula-name').value = '';
    document.getElementById('admin-formula-string').value = '';
    generateTestInputs();
}

// 共用的 POST 發送與按鈕狀態處理函數
async function sendPostToGAS(payload, buttonId, successMsg) {
    const btn = document.getElementById(buttonId);
    const originalText = btn.innerText;
    btn.innerText = "儲存寫入中...";
    btn.disabled = true;

    try {
        const response = await fetch(CONFIG.GAS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.status === "success") {
            alert(successMsg);
        } else {
            alert("儲存失敗: " + result.message);
        }
    } catch (error) {
        alert("網路連線錯誤，無法儲存。");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
