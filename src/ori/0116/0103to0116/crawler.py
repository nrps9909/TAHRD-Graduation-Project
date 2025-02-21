import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import time
import random
import threading
import logging
import json
import os
from collections import OrderedDict

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s: %(message)s')
logger = logging.getLogger()

# 初始化浏览器选项
options = Options()
options.binary_location = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--disable-blink-features=AutomationControlled")
options.add_argument("--disable-gpu")
options.add_argument("--disable-extensions")
options.add_argument(
    "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36"
)

# 初始化 undetected-chromedriver
driver = uc.Chrome(options=options)
driver.set_window_size(1920, 1080)

url = 'https://www.dcard.tw/f/career_skills_training_field'  # 設定爬取的 Dcard 網址
driver.get(url)
logger.info("Navigated to main page.")
time.sleep(random.uniform(8, 15))

stop_flag = False

# 隨機延遲
def random_sleep(min_seconds=1, max_seconds=3):
    time.sleep(random.uniform(min_seconds, max_seconds))

# 模擬用戶滾動行為
def simulate_user_interaction():
    scroll_height = driver.execute_script("return document.body.scrollHeight")
    random_scroll_position = random.randint(0, scroll_height)
    driver.execute_script(f"window.scrollTo(0, {random_scroll_position});")
    random_sleep(1, 3)

# 用戶輸入監聽執行緒
def listen_to_user_input():
    global stop_flag
    while True:
        user_input = input("輸入 'stop' 停止程序：")
        if user_input.lower() == 'stop':
            stop_flag = True
            print("收到停止指令，程序即將停止。")
            break

# 啟動用戶輸入監聽執行緒
input_thread = threading.Thread(target=listen_to_user_input)
input_thread.daemon = True
input_thread.start()

# 判斷是否為無關留言
def is_irrelevant_comment(content):
    content = content.strip()
    if len(content) < 5:  # 過短內容
        return True
    if content.isdigit() or all(char in "!?。，、" for char in content):  # 全為數字或特殊字符
        return True
    return False

# 滾動頁面以載入所有留言
def scroll_to_load_all_comments():
    scroll_pause_time = 1
    last_height = driver.execute_script("return document.body.scrollHeight")
    max_scroll_attempts = 10
    scroll_attempt = 0

    while scroll_attempt < max_scroll_attempts:
        if stop_flag:
            logger.info("檢測到停止指令，停止抓取。")
            break

        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(scroll_pause_time)

        # 嘗試點擊“載入更多留言”按鈕
        try:
            for _ in range(3):
                load_more_button = driver.find_element(By.XPATH, '//button[contains(text(), "載入更多留言")]')
                if load_more_button.is_displayed():
                    driver.execute_script("arguments[0].click();", load_more_button)
                    logger.info("點擊了'載入更多留言'按鈕。")
                    time.sleep(scroll_pause_time)
                else:
                    break
        except Exception:
            logger.info("未找到或無法點擊 '載入更多留言' 按鈕，停止滾動。")
            break

        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            scroll_attempt += 1
        else:
            scroll_attempt = 0
            last_height = new_height

    logger.info("完成滾動並加載留言。")

def extract_tags():
    """提取 <li> 標籤內的文字作為標籤"""
    try:
        li_elements = driver.find_elements(By.CSS_SELECTOR, "article ul li div div")
        tags = [li.text.strip() for li in li_elements if li.text.strip()]  # 確保只提取非空文字
        logger.info(f"提取到標籤：{tags}")
        return tags
    except Exception as e:
        logger.error(f"提取標籤時發生錯誤: {type(e).__name__}: {e}")
        return []

def extract_comments():
    comments = []
    try:
        comment_divs = driver.find_elements(By.CSS_SELECTOR, 'div[data-key^="comment-"]')
        logger.info(f"找到 {len(comment_divs)} 條留言。")

        for comment_div in comment_divs:
            try:
                comment_text_element = comment_div.find_element(By.CSS_SELECTOR, 'div.d_xa_34 > span')
                content = comment_text_element.text.strip()
                if content and not is_irrelevant_comment(content):
                    comments.append(content)
                else:
                    logger.info(f"忽略無關留言：{content}")
            except Exception as e:
                logger.error(f"提取單條留言時發生錯誤: {type(e).__name__}: {e}")
                continue
    except Exception as e:
        logger.error(f"抓取留言時發生錯誤: {type(e).__name__}: {e}")
    return list(set(comments))

# 提取文章內容的 <span> 標籤文字
def extract_article_content():
    try:
        span_elements = driver.find_elements(
            By.XPATH, '//article[contains(@class, "d_2l_f")]/descendant::span'
        )
        content = "\n".join(span.text.strip() for span in span_elements if span.text.strip())
        return content if content else "無法獲取文章內容"
    except Exception as e:
        logger.error(f"[文章內容提取] 發生錯誤: {type(e).__name__}: {e}")
        return "無法獲取文章內容"

# 即時保存至 JSON
def save_to_json(data):
    file_name = "dcard_data.json"

    # 初始化 JSON 檔案如果不存在
    if not os.path.exists(file_name) or os.stat(file_name).st_size == 0:
        with open(file_name, 'w', encoding='utf-8') as file:
            json.dump([], file, ensure_ascii=False, indent=4)

    with open(file_name, 'r+', encoding='utf-8') as file:
        try:
            # 讀取現有的資料
            existing_data = json.load(file)
        except json.JSONDecodeError:
            logger.warning(f"檢測到 {file_name} 文件損壞，重新初始化。")
            existing_data = []

        # 計算新條目的編號
        next_number = len(existing_data) + 1

        # 新增編號到資料結構中
        data["number"] = next_number

        # 檢查是否已存在相同的資料（避免重複儲存）
        if not any(item["link"] == data["link"] for item in existing_data):
            existing_data.append(data)
            # 將資料寫回檔案
            file.seek(0)
            json.dump(existing_data, file, ensure_ascii=False, indent=4)
            logger.info(f"已保存文章：{data['title']} 編號：{data['number']}")
        else:
            logger.info(f"文章已存在：{data['title']}，略過保存。")

        # 回傳已保存的資料數量
        return len(existing_data)



processed_posts = set()

# 開始爬取
while True:
    if stop_flag:
        logger.info("檢測到停止指令，停止抓取。")
        break
    try:
        logger.info("正在定位文章...")
        posts = driver.find_elements(By.CSS_SELECTOR, 'h2 > a')
        logger.info(f"找到 {len(posts)} 篇文章。")

        new_articles_found = False  # 檢查是否有新文章

        for post in posts:
            if stop_flag:
                break
            title_element = post.find_element(By.TAG_NAME, 'span')
            title = title_element.text if title_element else "無標題"
            link = post.get_attribute('href')
            if not link.startswith("https://"):
                link = "https://www.dcard.tw" + link
            if link not in processed_posts:
                processed_posts.add(link)

                logger.info(f"處理文章：{title}")
                driver.get(link)
                random_sleep(5, 10)

                article_content = extract_article_content()
                scroll_to_load_all_comments()
                comments = extract_comments()

                tags = extract_tags() 
                if comments or tags:
                    data = {
                        "title": title,
                        "link": link,
                        "tags": tags,
                        "content": article_content,
                        "comments": comments
                    }
                    total_saved = save_to_json(data)  # 保存資料並取得已保存筆數
                    if total_saved >= 200:  # 如果達到 200 筆限制
                        logger.info("已達到 200 筆資料限制，程序即將停止。")
                        stop_flag = True  # 設定停止標誌
                        break
                else:
                    logger.info(f"文章 {title} 無有效留言或標籤，略過保存。")

                driver.get(url)
                random_sleep(5, 10)
        if not new_articles_found:  # 如果沒有新文章，刷新頁面
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)  # 暫停以等待頁面載入

    except Exception as e:
        logger.error(f"[主頁抓取] 發生錯誤: {type(e).__name__}: {e}")
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)  # 暫停以等待頁面載入

# 結束爬取
driver.quit()