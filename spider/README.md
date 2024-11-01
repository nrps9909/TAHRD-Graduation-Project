# Dcard 感情板爬蟲

本專案是一個用於爬取 Dcard 感情板的網頁爬蟲，會提取前 10 篇文章的標題、連結及其評論。本文件提供詳細的環境建置說明，包括安裝依賴及在 WSL 中配置 Chrome 的步驟。

## 先決條件

1. 已安裝 **WSL（Windows Subsystem for Linux）** 和一個 Linux 發行版本（例如 Ubuntu）。
2. 安裝 **Chrome** 和 **ChromeDriver** 用於自動化。

## 環境建置步驟

### 步驟 1：安裝 Python 和 Pip

如果 WSL 中尚未安裝 Python 和 Pip，可以執行以下指令來安裝：

```bash
sudo apt update
sudo apt install python3 python3-pip -y
```

### 步驟 2：安裝 Python 依賴

使用 pip 安裝所需的 Python 套件：

```bash
pip install undetected-chromedriver selenium
```

#### 依賴項目說明
- `undetected-chromedriver`：一個 ChromeDriver 包裝工具，用於幫助繞過網站的反爬蟲檢測。
- `selenium`：提供瀏覽器自動化的工具。

### 步驟 3：在 WSL 中安裝 Google Chrome

1. **下載 Chrome for Linux**：
   可以直接在 WSL 中下載 Chrome `.deb` 安裝包，或從 [Google Chrome 官網](https://www.google.com/chrome/) 下載。

   ```bash
   wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
   ```

2. **安裝 Chrome**：

   ```bash
   sudo apt install ./google-chrome-stable_current_amd64.deb
   ```

3. **驗證安裝**：
   確保 Chrome 已正確安裝，可以運行以下指令查看版本：

   ```bash
   google-chrome --version
   ```

   如果安裝成功，應該會顯示 Chrome 的版本號。

### 步驟 4：安裝 ChromeDriver

1. **下載 ChromeDriver**：
   下載與您的 Chrome 版本相符的 ChromeDriver。您可以在 [這裡](https://sites.google.com/chromium.org/driver/) 找到相應版本的 ChromeDriver。

2. **解壓縮並移動 ChromeDriver**：
   下載完成後，解壓縮並將 `chromedriver` 移動到一個方便的位置。在本指南中，假設您將它移動到 `/mnt/d/TAHRD/TAHRD-Graduation-Project/chromedriver-linux64/`。

   ```bash
   mkdir -p /mnt/d/TAHRD/TAHRD-Graduation-Project/chromedriver-linux64/
   mv chromedriver /mnt/d/TAHRD/TAHRD-Graduation-Project/chromedriver-linux64/
   chmod +x /mnt/d/TAHRD/TAHRD-Graduation-Project/chromedriver-linux64/chromedriver
   ```

### 步驟 5：在 WSL 中配置 Chrome 的無頭模式

由於 WSL 沒有圖形介面，需要將 Chrome 設置為無頭模式：

1. 打開 `app.py` 文件，並在 Chrome 的選項中加入 `--headless` 參數（如果尚未加入）。

   ```python
   options.add_argument("--headless")
   ```

### 步驟 6：執行爬蟲

環境配置完成後，可以使用以下指令運行爬蟲：

```bash
python app.py
```

運行後，會在專案目錄中生成 `dcard_comments.txt` 文件，包含爬取的數據。

## 文件結構

```
.
├── app.py                  # 主爬蟲代碼
├── README.md               # 本說明文件
└── dcard_comments.txt      # 爬取結果輸出文件
```

## 常見問題排查

- **`ModuleNotFoundError`**：確保已安裝所有 Python 依賴，可以用 `pip list` 檢查已安裝的套件。
- **`chromedriver` 無法執行**：確認 `chromedriver` 已有正確的執行權限，使用 `chmod +x chromedriver` 來賦予權限。
- **無頭模式問題**：如果 Chrome 無法在無頭模式下啟動，確保已在選項中添加 `--headless` 參數。

## 額外提示

- 避免過於頻繁地運行腳本，Dcard 可能會檢測並阻止過於頻繁的請求。
- 可以在腳本中的 `quick_sleep` 函數中添加延遲，以避免被檢測為爬蟲行為。

本指南應能協助您順利在 WSL 中完成 Dcard 爬蟲的環境建置與使用。祝您爬取順利！
```