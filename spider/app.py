import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import time
import random
import threading

# 配置日志
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s:%(message)s')
logger = logging.getLogger()

# 初始化浏览器选项
options = Options()
options.binary_location = "/home/ainsley/chrome/chrome"
# options.add_argument('--headless')  # 调试时可以注释掉
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--disable-blink-features=AutomationControlled")
options.add_argument("--disable-gpu")
options.add_argument("--disable-extensions")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36")

# 初始化 undetected-chromedriver
driver = uc.Chrome(options=options)
driver.set_window_size(1920, 1080)

url = 'https://www.dcard.tw/f/relationship'
driver.get(url)
logger.info("Navigated to main page.")
time.sleep(random.uniform(5, 10))

stop_flag = False

def random_sleep(min_seconds=1, max_seconds=3):
    time.sleep(random.uniform(min_seconds, max_seconds))

def simulate_user_interaction():
    scroll_height = driver.execute_script("return document.body.scrollHeight")
    random_scroll_position = random.randint(0, scroll_height)
    driver.execute_script(f"window.scrollTo(0, {random_scroll_position});")
    random_sleep(0.5, 2)

def listen_to_user_input():
    global stop_flag
    while True:
        user_input = input("輸入 'stop' 停止程序：")
        if user_input.lower() == 'stop':
            stop_flag = True
            print("收到停止指令，程序即將停止。")
            break

# 启动用户输入监听线程
input_thread = threading.Thread(target=listen_to_user_input)
input_thread.daemon = True
input_thread.start()

def is_irrelevant_comment(content):
    content = content.strip()
    # 如果评论内容过短，认为是无关评论
    if len(content) < 5:
        return True
    return False

def scroll_to_load_all_comments():
    scroll_pause_time = 1
    last_height = driver.execute_script("return document.body.scrollHeight")
    scroll_attempt = 0
    max_scroll_attempts = 10

    while True:
        if stop_flag:
            logger.info("检测到停止指令，停止抓取。")
            break

        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(scroll_pause_time)

        # 尝试点击“載入更多留言”按钮
        try:
            load_more_button = driver.find_element(By.XPATH, '//button[contains(text(), "載入更多留言")]')
            if load_more_button.is_displayed():
                driver.execute_script("arguments[0].click();", load_more_button)
                logger.info("点击了'載入更多留言'按钮。")
                time.sleep(scroll_pause_time)
        except Exception:
            pass

        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            scroll_attempt += 1
            if scroll_attempt >= max_scroll_attempts:
                logger.info("多次滚动后页面高度未变化，认为已加载完所有评论。")
                break
        else:
            scroll_attempt = 0
            last_height = new_height

processed_posts = set()

with open("dcard_comments.txt", "w", encoding="utf-8") as file:
    while True:
        if stop_flag:
            logger.info("檢測到停止指令，停止抓取。")
            break
        try:
            logger.info("Attempting to locate posts...")
            posts = driver.find_elements(By.CSS_SELECTOR, 'h2 > a')
            logger.info(f"Found {len(posts)} posts.")

            # 收集帖子数据
            post_data = []
            for post in posts:
                title_element = post.find_element(By.TAG_NAME, 'span')
                title = title_element.text if title_element else "無標題"
                link = post.get_attribute('href')
                if not link.startswith("https://"):
                    link = "https://www.dcard.tw" + link
                if link not in processed_posts:
                    post_data.append((title, link))
                    processed_posts.add(link)

            # 遍歷帖子数据，跳過第一篇
            for title, link in post_data[1:]:
                if stop_flag:
                    logger.info("檢測到停止指令，停止抓取。")
                    break
                retry_count = 0
                while retry_count < 3:
                    if stop_flag:
                        logger.info("檢測到停止指令，停止抓取。")
                        break
                    try:
                        file.write(f"標題: {title}\n連結: {link}\n")
                        file.flush()
                        logger.info(f"Processing post: {title}")
                        logger.info(f"Link: {link}")

                        # 进入文章
                        logger.info("Navigating to post...")
                        driver.get(link)
                        logger.info(f"Current URL after navigation: {driver.current_url}")
                        random_sleep(2, 5)

                        # 模擬用戶行為
                        simulate_user_interaction()

                        # 检查是否是错误页面
                        page_source = driver.page_source
                        if "錯誤訊息" in page_source or "此內容已不存在或無法取得" in page_source:
                            logger.warning("Post not found or inaccessible.")
                            file.write("文章不存在或無法取得\n")
                            file.write("-" * 50 + "\n")
                            file.flush()
                            break

                        # 等待文章内容加载并提取
                        article_element = driver.find_element(By.CSS_SELECTOR, 'article')
                        article_content = article_element.text.strip()
                        file.write(f"文章內容:\n{article_content}\n")
                        file.flush()
                        logger.info(f"文章內容: {article_content}")

                        # 滚动页面以加载所有评论
                        scroll_to_load_all_comments()

                        # 抓取所有留言
                        logger.info("Attempting to locate comments...")
                        comment_divs = driver.find_elements(By.CSS_SELECTOR, 'div[data-key^="comment-"]')
                        logger.info(f"Found {len(comment_divs)} comments.")

                        if comment_divs:
                            for comment_div in comment_divs:
                                if stop_flag:
                                    logger.info("检测到停止指令，停止抓取。")
                                    break
                                try:
                                    # 使用 XPath 定位评论内容的 span
                                    comment_text_element = comment_div.find_element(By.XPATH, './/div[starts-with(@class, "d_xa_") and contains(@class, "d_xj_")]/span')
                                    content = comment_text_element.text.strip()
                                    # 如果内容不为空且不是无关评论，写入文件
                                    if content:
                                        if not is_irrelevant_comment(content):
                                            file.write(f"留言: {content}\n")
                                            file.flush()
                                            logger.info(f"留言: {content}")
                                        else:
                                            logger.info(f"跳过无关留言: {content}")
                                    else:
                                        logger.info("未找到评论内容")
                                except Exception as e:
                                    logger.error(f"提取评论时遇到错误: {e}")
                                    continue
                        else:
                            file.write("無留言\n")
                            file.flush()
                            logger.info("無留言")

                        file.write("-" * 50 + "\n")
                        file.flush()
                        # 返回主頁
                        logger.info("Returning to main page.")
                        driver.get(url)
                        random_sleep(2, 5)
                        break
                    except Exception as e:
                        logger.error(f"遇到錯誤 at URL {driver.current_url}: {type(e).__name__}: {e}，重試中...")
                        retry_count += 1
                        logger.info("Retrying...")
                        driver.get(link)
                        random_sleep(2, 5)
            # 等待一段時間，再次获取帖子
            time.sleep(60)
        except Exception as e:
            logger.error(f"主頁元素定位超時，重試中... Exception: {type(e).__name__}: {e}")
            driver.refresh()
            time.sleep(random.uniform(5, 10))

driver.quit()
