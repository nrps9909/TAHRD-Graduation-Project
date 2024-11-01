import undetected_chromedriver as uc
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import random
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s:%(message)s')
logger = logging.getLogger()

chrome_driver_path = "/mnt/d/TAHRD/TAHRD-Graduation-Project/chromedriver-linux64/chromedriver"
options = Options()
options.binary_location = "/home/ainsley/chrome/chrome"
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--disable-blink-features=AutomationControlled")
options.add_argument("--disable-gpu")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36")

# Initialize undetected-chromedriver without specifying v2
driver = uc.Chrome(options=options)
wait = WebDriverWait(driver, 20)

url = 'https://www.dcard.tw/f/relationship'
driver.get(url)
logger.info("Navigated to main page.")
time.sleep(random.uniform(5, 10))

def random_sleep(min_seconds=1, max_seconds=3):
    time.sleep(random.uniform(min_seconds, max_seconds))

def simulate_user_interaction(driver):
    scroll_height = driver.execute_script("return document.body.scrollHeight")
    random_scroll_position = random.randint(0, scroll_height)
    driver.execute_script(f"window.scrollTo(0, {random_scroll_position});")
    random_sleep(0.5, 2)

    action = webdriver.ActionChains(driver)
    action.move_by_offset(random.randint(0, 100), random.randint(0, 100)).perform()
    random_sleep(0.5, 2)

with open("dcard_comments.txt", "w", encoding="utf-8") as file:
    for attempt in range(3):  # 主頁的重試機制，最多重試3次
        try:
            logger.info("Attempting to locate posts...")
            posts = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, 'h2 > a')))
            logger.info(f"Found {len(posts)} posts.")

            # Collect the first 10 post data (title and link)
            post_data = []
            for post in posts[:10]:  # 限制為前10篇文章
                title_element = post.find_element(By.TAG_NAME, 'span')
                title = title_element.text if title_element else "無標題"
                link = post.get_attribute('href')
                if not link.startswith("https://"):
                    link = "https://www.dcard.tw" + link
                post_data.append((title, link))
            break  # 成功获取后跳出重試
        except Exception as e:
            logger.error(f"主頁元素定位超時，重試中... Exception: {type(e).__name__}: {e}")
            driver.refresh()
            time.sleep(random.uniform(5, 10))

    # 遍歷收集到的10篇帖子数据
    for title, link in post_data:
        retry_count = 0
        while retry_count < 3:  # 單篇文章重試機制
            try:
                file.write(f"標題: {title}\n連結: {link}\n")
                logger.info(f"Processing post: {title}")
                logger.info(f"Link: {link}")

                # 進入文章抓取留言
                logger.info("Navigating to post...")
                driver.get(link)
                logger.info(f"Current URL after navigation: {driver.current_url}")
                random_sleep(2, 5)

                # 模擬用戶行為
                simulate_user_interaction(driver)

                # 檢查是否是錯誤頁面
                page_source = driver.page_source
                if "錯誤訊息" in page_source or "此內容已不存在或無法取得" in page_source:
                    logger.warning("Post not found or inaccessible.")
                    file.write("文章不存在或無法取得\n")
                    file.write("-" * 50 + "\n")
                    break  # 跳過該帖子

                # 等待文章內容加載
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'article')))
                logger.info("Post page loaded.")

                # 滚动页面以加载所有评论
                last_height = driver.execute_script("return document.body.scrollHeight")
                while True:
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    random_sleep(2, 4)
                    new_height = driver.execute_script("return document.body.scrollHeight")
                    if new_height == last_height:  # 如果滾動到底部
                        break
                    last_height = new_height

                # 抓取所有留言
                logger.info("Attempting to locate comments...")
                comment_divs = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, 'div[data-key^="comment-"]')))
                logger.info(f"Found {len(comment_divs)} comments.")

                if comment_divs:
                    for comment_div in comment_divs:  # 抓取所有留言
                        try:
                            # 找到评论文本的 <span>
                            comment_text_element = comment_div.find_element(By.CSS_SELECTOR, 'div > span')
                            content = comment_text_element.text
                            file.write(f"留言: {content}\n")
                            logger.info(f"留言: {content}")
                        except Exception as e:
                            logger.error(f"提取评论时遇到错误: {e}")
                            continue
                else:
                    file.write("無留言\n")
                    logger.info("無留言")

                file.write("-" * 50 + "\n")
                # 返回主頁
                logger.info("Returning to main page.")
                driver.get(url)
                random_sleep(2, 5)
                break  # 成功處理後跳出重試
            except Exception as e:
                logger.error(f"遇到錯誤 at URL {driver.current_url}: {type(e).__name__}: {e}，重試中...")
                retry_count += 1
                logger.info("Retrying...")
                driver.get(link)  # 刷新頁面
                random_sleep(2, 5)

driver.quit()
