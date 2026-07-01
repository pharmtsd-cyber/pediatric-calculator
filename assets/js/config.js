// assets/js/config.js

// 部署核心提示：請替換為您在第一階段部署的 Google Apps Script Web App 網址
const CONFIG = {
    GAS_API_URL: "https://script.google.com/macros/s/AKfycbxEnA79SWNy5m-sVhVl7wxMINbI3wXLI5Bsz3MbNGSgowU1WE_Lr40pDLu712wTATzA/exec",
    VERSION: "v1.0.0"
};

// 全域暫存資料庫
const STORE = {
    drugs: [],
    parameters: [],
    formulas: []
};

// ==========================================
// 共用公式運算引擎 (前後台共用)
// ==========================================
window.sharedCalc = function(str, scope) {
    if (!str || String(str).trim() === '') return null;
    try {
        let s = String(str);

        // 步驟 1：優先把所有 {變數} 換成真實數值！
        // 這樣 {max} 就會安全變成數字 (例如 48)，不會被後續的替換破壞。
        for (let code in scope) {
            const val = (scope[code] === '' || isNaN(scope[code])) ? 0 : scope[code];
            s = s.replace(new RegExp(`\\{${code}\\}`, 'gi'), val);
        }
        
        // 將剩下的未定義變數強迫補 0
        s = s.replace(/{[a-zA-Z0-9_]+}/g, '0');

        // 步驟 2：變數都變成數字後，再來安全地做數學與邏輯符號的轉換
        s = s.replace(/x/gi, '*') // 現在不會誤傷到 {max} 裡的 x 了
             .replace(/<>/g, '!=')
             .replace(/\[/g, '(')
             .replace(/\]/g, ')')
             .replace(/\s+or\s+/gi, ' || ')
             .replace(/\s+and\s+/gi, ' && ');
        
        // 執行運算
        return new Function('return ' + s)();
    } catch(e) {
        console.error("運算失敗:", str, "錯誤原因:", e);
        return null;
    }
};
