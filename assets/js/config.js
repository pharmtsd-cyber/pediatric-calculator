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
// 共用公式運算引擎 (前後台共用 - 終極防呆版)
// ==========================================
window.sharedCalc = function(str, scope) {
    if (!str || String(str).trim() === '') return null;
    try {
        let s = String(str)
            .replace(/x/gi, '*')
            .replace(/<>/g, '!=')
            .replace(/\[/g, '(')
            .replace(/\]/g, ')')
            .replace(/\s+or\s+/gi, ' || ')
            .replace(/\s+and\s+/gi, ' && ')
            .replace(/＞/g, '>').replace(/＜/g, '<').replace(/＝/g, '=');

        // 1. 先處理系統保留變數 {min} 和 {max} (確保它們優先被正確替換)
        s = s.replace(/{min}/gi, `(${scope['min'] || 0})`);
        s = s.replace(/{max}/gi, `(${scope['max'] || 0})`);

        // 2. 再處理使用者自訂的參數變數
        for (let code in scope) {
            // 排除掉已經處理過的 min 和 max
            if (code === 'min' || code === 'max') continue;
            
            const val = (scope[code] === '' || isNaN(scope[code])) ? 0 : scope[code];
            // 使用 Word Boundary 確保只取代參數名稱，不影響其他文字
            const regex = new RegExp(`\\{${code}\\}`, 'gi');
            s = s.replace(regex, `(${val})`);
        }
        
        // 3. 強制將邏輯運算子轉為 JavaScript 可執行的格式
        s = s.replace(/==/g, '===')
             .replace(/!=/g, '!==')
             .replace(/>=/g, '>=')
             .replace(/<=/g, '<=')
             .replace(/=/g, '===');
        
        // 4. 清除任何漏網之魚的 {變數} 並執行
        s = s.replace(/{[a-zA-Z0-9_]+}/g, '(0)');
        
        return new Function('return (' + s + ')')();
    } catch(e) {
        console.error("運算失敗:", str, e);
        return null;
    }
};
