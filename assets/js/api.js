async function fetchFromGAS(action) {
    if (!CONFIG.GAS_API_URL) {
        console.error("尚未設定 GAS API 網址");
        return null;
    }

    try {
        const response = await fetch(`${CONFIG.GAS_API_URL}?action=${action}`);
        
        // 【優化點 1】先檢查 HTTP 狀態碼
        if (!response.ok) {
            console.error("API 連線失敗，狀態碼:", response.status);
            return null;
        }

        // 【優化點 2】先取得文字內容，檢查是否為 HTML 錯誤頁面 (避免直接解析 JSON 報錯)
        const text = await response.text();
        
        // 如果內容包含 <!DOCTYPE html> 或 <html>，代表被 Google 攔截重導向了
        if (text.trim().startsWith('<')) {
            console.error("API 被伺服器攔截 (可能是 302 重導向或權限問題)，回傳內容非 JSON。");
            return null;
        }

        // 正常解析 JSON
        const result = JSON.parse(text);
        
        if (result.status === "success") {
            return result.data;
        } else {
            console.error("API 業務邏輯錯誤:", result.message);
            return null;
        }
    } catch (error) {
        console.error("Fetch 發生異常:", error);
        return null;
    }
}
