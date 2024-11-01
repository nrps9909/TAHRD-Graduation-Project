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

### 步驟 3：下載並配置 Google Chrome 和 ChromeDriver

1. **下載 Chrome for Linux**：

   您可以從以下連結下載適用於 Linux 的 Chrome 二進位檔案：
   [Chrome for Linux 下載連結](https://storage.googleapis.com/chrome-for-testing-public/130.0.6723.91/linux64/chrome-linux64.zip)

2. **解壓縮 Chrome 並複製到 WSL**：

   假設您已經在 Windows 上下載了 `chrome-linux64.zip`。您可以使用以下命令將解壓縮後的 `chrome` 資料夾移至 WSL：

   ```bash
   # 在 Windows 上解壓縮後，將 chrome 資料夾移到 WSL 的指定目錄
   cp -r /mnt/d/TAHRD/TAHRD-Graduation-Project/chrome ~/chrome
   ```

3. **複製 ChromeDriver**：

   同樣地，假設您已經將 `chromedriver` 解壓縮至 `chromedriver-linux64` 資料夾，您可以將其複製到 WSL 的指定目錄：

   ```bash
   cp -r /mnt/d/TAHRD/TAHRD-Graduation-Project/chromedriver-linux64 ~/chromedriver-linux64
   ```

4. **確認 Chrome 和 ChromeDriver**：
   確認 `chrome` 和 `chromedriver` 已正確放置，並且具有執行權限：

   ```bash
   # 確認 Chrome
   ~/chrome/chrome --version

   # 確認 ChromeDriver
   chmod +x ~/chromedriver-linux64/chromedriver
   ~/chromedriver-linux64/chromedriver --version
   ```

### 步驟 4：在 WSL 中配置 Chrome 的無頭模式

由於 WSL 沒有圖形介面，需要將 Chrome 設置為無頭模式：

1. 打開 `app.py` 文件，並在 Chrome 的選項中加入 `--headless` 參數（如果尚未加入）。

   ```python
   options.add_argument("--headless")
   ```

### 步驟 5：執行爬蟲

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
├── dcard_comments.txt      # 爬取結果輸出文件
├── chrome                  # Google Chrome 執行檔
└── chromedriver-linux64    # ChromeDriver 執行檔
```

## 常見問題排查

- **`ModuleNotFoundError`**：確保已安裝所有 Python 依賴，可以用 `pip list` 檢查已安裝的套件。
- **`chromedriver` 無法執行**：確認 `chromedriver` 已有正確的執行權限，使用 `chmod +x chromedriver` 來賦予權限。
- **無頭模式問題**：如果 Chrome 無法在無頭模式下啟動，確保已在選項中添加 `--headless` 參數。

## 額外提示

- 避免過於頻繁地運行腳本，Dcard 可能會檢測並阻止過於頻繁的請求。
- 可以在腳本中的 `quick_sleep` 函數中添加延遲，以避免被檢測為爬蟲行為。