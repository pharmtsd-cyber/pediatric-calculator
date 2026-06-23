document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('btn-save-formula')) document.getElementById('btn-save-formula').onclick = saveFormula;

    let ACTIVE_FORMULA_INPUT = 'admin-formula-min';
    const minI = document.getElementById('admin-formula-min'), maxI = document.getElementById('admin-formula-max');
    if(minI) { minI.addEventListener('focus', () => ACTIVE_FORMULA_INPUT = 'admin-formula-min'); minI.addEventListener('input', generateTestInputs); }
    if(maxI) { maxI.addEventListener('focus', () => ACTIVE_FORMULA_INPUT = 'admin-formula-max'); maxI.addEventListener('input', generateTestInputs); }

    document.querySelectorAll('.op-btn').forEach(btn => {
        btn.onclick = (e) => {
            const textarea = document.getElementById(ACTIVE_FORMULA_INPUT);
            if(!textarea) return;
            const startPos = textarea.selectionStart;
            const textToInsert = ` ${e.target.innerText} `;
            textarea.value = textarea.value.substring(0, startPos) + textToInsert + textarea.value.substring(textarea.selectionEnd);
            textarea.selectionStart = textarea.selectionEnd = startPos + textToInsert.length;
            textarea.focus(); generateTestInputs();
        };
    });
});

window.renderDashFormulas = function(dashDrugs) {
    const dashFormulasList = document.getElementById('list-dash-formulas');
    if (!dashFormulasList) return;

    const validIds = new Set();
    dashDrugs.forEach(d => { validIds.add(String(d.drug_id).trim().toLowerCase()); if (d.drug_code) validIds.add(String(d.drug_code).trim().toLowerCase()); });

    const dashFormulas = STORE.formulas.filter(f => validIds.has(String(f.drug_id).trim().toLowerCase()));

    dashFormulasList.innerHTML = dashFormulas.length === 0 ? 
        `<tr><td colspan="5" class="text-center text-gray-400 py-4">目前篩選條件下無對應公式</td></tr>` :
        dashFormulas.map(f => {
            const targetId = String(f.drug_id).trim().toLowerCase();
            const d = dashDrugs.find(x => String(x.drug_id).trim().toLowerCase() === targetId || String(x.drug_code).trim().toLowerCase() === targetId); 
            const drugName = d ? (d.local_name || d.generic_name) : '未知藥品';
            const actualDrugId = d ? d.drug_id : f.drug_id;
            
            return `<tr class="hover:bg-purple-50 transition">
                <td class="pt-3 font-bold text-purple-900">${drugName}</td>
                <td class="pt-3"><i class="fa-solid fa-pen text-xs text-gray-400 mr-1"></i> ${f.formula_name}</td>
                <td class="pt-3 font-mono text-[11px] text-blue-800 bg-blue-50 p-1 rounded">Min: ${f.formula_min||'--'}<br>Max: ${f.formula_max||'--'}</td>
                <td class="pt-3 text-xs text-red-600">單:${f.single_max||'--'} ${f.single_max_unit||''}<br>日:${f.daily_max||'--'} ${f.daily_max_unit||''}</td>
                <td class="pt-3">
                    <button onclick="goToFormulaEdit('${actualDrugId}', '${f.formula_id}')" class="text-blue-600 hover:text-blue-800 mr-2 font-bold text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200"><i class="fa-solid fa-pen"></i> 編輯</button>
                    <button onclick="deleteRecord('deleteFormula', '${f.formula_id}')" class="text-red-500 hover:text-red-700 text-xs px-2 py-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
};

window.goToAddFormula = function() {
    resetFormulaForm();
    CONTEXT_DRUG = null; 
    
    // 【新增】將藥品匯入下拉選單讓使用者可以自由選擇
    const sel = document.getElementById('admin-formula-drug-id');
    if(sel) {
        sel.innerHTML = '<option value="">-- 請選擇綁定藥品 --</option>';
        STORE.drugs.forEach(d => {
            const name = `${d.drug_code || ''} ${d.local_name || d.generic_name}`.trim();
            sel.add(new Option(name, d.drug_id));
        });
        sel.disabled = false;
    }
    
    document.getElementById('formula-editor-title').innerText = "新增計算公式";
    switchTab('formulas');
    scrollToTop();
};

window.goToFormulaEdit = function(drugId, formulaId) {
    const f = STORE.formulas.find(x => x.formula_id === formulaId);
    if(!f) return;
    
    resetFormulaForm();
    CONTEXT_DRUG = STORE.drugs.find(d => String(d.drug_id) === String(drugId) || String(d.drug_code) === String(drugId));
    
    const sel = document.getElementById('admin-formula-drug-id');
    if(sel) {
        sel.innerHTML = '';
        if (CONTEXT_DRUG) {
            const name = `${CONTEXT_DRUG.drug_code || ''} ${CONTEXT_DRUG.local_name || CONTEXT_DRUG.generic_name}`.trim();
            sel.add(new Option(name, CONTEXT_DRUG.drug_id));
            sel.value = CONTEXT_DRUG.drug_id;
        } else {
            sel.add(new Option('遺失綁定關聯 (舊資料)', f.drug_id));
        }
        sel.disabled = true; // 編輯狀態不允許切換藥品
    }

    const setVal = (elId, val) => { if(document.getElementById(elId)) document.getElementById(elId).value = val; };
    setVal('formula-mode', 'edit'); setVal('formula-id', f.formula_id);
    setVal('admin-formula-name', f.formula_name); setVal('admin-result-unit', f.result_unit);
    setVal('admin-remark', f.remark || ''); setVal('formula-single-max', f.single_max || '');
    setVal('formula-single-unit', f.single_max_unit || ''); setVal('formula-daily-max', f.daily_max || '');
    setVal('formula-daily-unit', f.daily_max_unit || ''); setVal('admin-formula-min', f.formula_min || '');
    setVal('admin-formula-max', f.formula_max || '');
    
    generateTestInputs();
    document.getElementById('formula-editor-title').innerText = "編輯公式：" + f.formula_name;
    document.getElementById('btn-save-formula').innerText = "更新儲存區間"; 
    
    switchTab('formulas');
    scrollToTop();
};

window.resetFormulaForm = function() {
    const setVal = (elId, val) => { if(document.getElementById(elId)) document.getElementById(elId).value = val; };
    setVal('formula-mode', 'add'); setVal('formula-id', '');
    ['admin-formula-name','admin-result-unit','admin-remark','formula-single-max','formula-single-unit','formula-daily-max','formula-daily-unit','admin-formula-min','admin-formula-max'].forEach(id => setVal(id, ''));
    
    const testInp = document.getElementById('admin-test-inputs');
    if(testInp) testInp.innerHTML = '請先輸入公式'; 
    
    const testRes = document.getElementById('admin-test-result');
    if(testRes) testRes.innerText = '-- ~ --';
};

window.saveFormula = async function() {
    const sel = document.getElementById('admin-formula-drug-id');
    const assignedDrugId = sel ? sel.value : null;
    if (!assignedDrugId) return alert("發生錯誤：請先選擇綁定的藥品！");

    const getVal = id => document.getElementById(id) ? document.getElementById(id).value : '';
    const payload = {
        action: 'saveFormula', mode: getVal('formula-mode'), formula_id: getVal('formula-id'), drug_id: assignedDrugId,
        formula_name: getVal('admin-formula-name'), formula_min: getVal('admin-formula-min'), formula_max: getVal('admin-formula-max'), result_unit: getVal('admin-result-unit'),
        single_max: getVal('formula-single-max'), single_max_unit: getVal('formula-single-unit'), daily_max: getVal('formula-daily-max'), daily_max_unit: getVal('formula-daily-unit'), remark: getVal('admin-remark')
    };
    if(!payload.formula_name || !payload.formula_min) return alert("方法名稱與下限公式必填");
    await sendPost(payload); 
    returnToDashboard();
};

window.renderParameterPad = function() {
    let activeInput = window.ACTIVE_FORMULA_INPUT || 'admin-formula-min';
    const pad = document.getElementById('admin-param-pad');
    if(pad) pad.innerHTML = STORE.parameters.map(p => `<button type="button" class="text-xs bg-[#1B365D] text-white px-2 py-1 rounded hover:bg-blue-800" onclick="const ta=document.getElementById('${activeInput}'); ta.value = ta.value.substring(0, ta.selectionStart) + '{${p.param_code}}' + ta.value.substring(ta.selectionEnd); generateTestInputs();">${p.param_name}</button>`).join('');
};

window.generateTestInputs = function() {
    const fMin = document.getElementById('admin-formula-min') ? document.getElementById('admin-formula-min').value : '';
    const fMax = document.getElementById('admin-formula-max') ? document.getElementById('admin-formula-max').value : '';
    const combinedStr = fMin + " " + fMax;
    
    const uniqueCodes = new Set(); let match; const paramRegex = /{([^}]+)}/g; 
    while ((match = paramRegex.exec(combinedStr)) !== null) uniqueCodes.add(match[1]);
    
    const testContainer = document.getElementById('admin-test-inputs');
    if(!testContainer) return;
    
    if (uniqueCodes.size === 0) { testContainer.innerHTML = '尚無參數'; document.getElementById('admin-test-result').innerText = '-- ~ --'; return; }
    
    const oldValues = {}; document.querySelectorAll('.test-input').forEach(input => oldValues[input.getAttribute('data-testcode')] = input.value);
    testContainer.innerHTML = '';
    uniqueCodes.forEach(code => {
        const paramDef = STORE.parameters.find(p => p.param_code === code), displayName = paramDef ? paramDef.param_name : code;
        testContainer.innerHTML += `<div><label class="block text-[10px] font-bold">${displayName}</label><input type="number" data-testcode="${code}" class="test-input w-full border border-blue-300 rounded px-1 py-0.5 text-xs focus:border-[#1B365D]" value="${oldValues[code]||''}"></div>`;
    });
    document.querySelectorAll('.test-input').forEach(input => input.addEventListener('input', runLiveTest)); runLiveTest();
};

window.runLiveTest = function() {
    let fMin = document.getElementById('admin-formula-min') ? document.getElementById('admin-formula-min').value : '';
    let fMax = document.getElementById('admin-formula-max') ? document.getElementById('admin-formula-max').value : '';
    
    document.querySelectorAll('.test-input').forEach(input => { 
        const val = input.value || '0', regex = new RegExp(`{${input.getAttribute('data-testcode')}}`, 'g');
        fMin = fMin.replace(regex, val); fMax = fMax.replace(regex, val);
    });
    let resMin = '--', resMax = '--';
    try { if (fMin.trim()) resMin = Math.round(math.evaluate(fMin) * 100) / 100; } catch(e){}
    try { if (fMax.trim()) resMax = Math.round(math.evaluate(fMax) * 100) / 100; } catch(e){}
    
    const resEl = document.getElementById('admin-test-result');
    if(resEl) resEl.innerText = (fMax.trim() && resMax !== '--') ? `${resMin} ~ ${resMax}` : `${resMin}`;
};
