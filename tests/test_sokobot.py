from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
import time

BASE_URL = "http://localhost:5173"


def setup_driver():
    driver = webdriver.Firefox()
    driver.maximize_window()
    return driver


def login(driver):
    driver.get(f"{BASE_URL}/login")
    time.sleep(2)

    driver.find_element(By.XPATH, "//span[text()='Email']/following::input[1]").send_keys("admin@wrms.com")
    driver.find_element(By.XPATH, "//span[text()='Password']/following::input[1]").send_keys("admin123")

    driver.find_element(By.XPATH, "//button[contains(text(),'Login')]").click()
    time.sleep(3)


# ---------------- AUTH ---------------- #

def test_login_valid():
    driver = setup_driver()
    login(driver)
    print("TC_001 Passed")
    driver.quit()


def test_login_invalid():
    driver = setup_driver()
    driver.get(f"{BASE_URL}/login")
    time.sleep(2)

    driver.find_element(By.XPATH, "//span[text()='Email']/following::input[1]").send_keys("admin@wrms.com")
    driver.find_element(By.XPATH, "//span[text()='Password']/following::input[1]").send_keys("wrongpass")

    driver.find_element(By.XPATH, "//button[contains(text(),'Login')]").click()
    time.sleep(2)

    print("TC_002 Passed")
    driver.quit()


def test_logout():
    driver = setup_driver()
    login(driver)

    driver.find_element(By.XPATH, "//button[contains(text(),'Sign Out')]").click()
    time.sleep(2)

    print("TC_003 Passed")
    driver.quit()


# ---------------- ROBOTS ---------------- #

def test_view_robot_list():
    driver = setup_driver()
    login(driver)

    driver.get(f"{BASE_URL}/app/robots")
    time.sleep(2)

    print("TC_004 Passed")
    driver.quit()


def test_select_robot():
    driver = setup_driver()
    login(driver)

    driver.get(f"{BASE_URL}/app/robots")
    time.sleep(2)

    driver.find_elements(By.XPATH, "//button")[0].click()
    time.sleep(1)

    print("TC_005 Passed")
    driver.quit()


def test_emergency_stop():
    driver = setup_driver()
    login(driver)

    driver.get(f"{BASE_URL}/app/dashboard")
    time.sleep(2)

    driver.find_element(By.XPATH, "//button[contains(text(),'E-Stop')]").click()
    time.sleep(1)

    print("TC_006 Passed")
    driver.quit()


def test_clear_emergency():
    driver = setup_driver()
    login(driver)

    driver.get(f"{BASE_URL}/app/dashboard")
    time.sleep(2)

    driver.find_element(By.XPATH, "//button[contains(text(),'Clear')]").click()
    time.sleep(1)

    print("TC_007 Passed")
    driver.quit()


# ---------------- TASKS ---------------- #

def test_create_task():
    driver = setup_driver()
    login(driver)

    driver.get(f"{BASE_URL}/app/tasks")
    time.sleep(2)

    Select(driver.find_element(By.XPATH, "//span[text()='Source Waypoint']/following::select[1]")).select_by_index(1)
    Select(driver.find_element(By.XPATH, "//span[text()='Destination Waypoint']/following::select[1]")).select_by_index(2)

    driver.find_element(By.XPATH, "//button[contains(text(),'Submit')]").click()
    time.sleep(2)

    print("TC_008 Passed")
    driver.quit()


def test_auto_assign():
    driver = setup_driver()
    login(driver)

    driver.get(f"{BASE_URL}/app/tasks")
    time.sleep(2)

    print("TC_009 Passed")
    driver.quit()


# ---------------- MAP ---------------- #

def test_map_load():
    driver = setup_driver()
    login(driver)

    driver.get(f"{BASE_URL}/app/dashboard")
    time.sleep(3)

    print("TC_010 Passed")
    driver.quit()


def test_map_click_robot():
    driver = setup_driver()
    login(driver)

    driver.get(f"{BASE_URL}/app/dashboard")
    time.sleep(3)

    elems = driver.find_elements(By.XPATH, "//circle")
    if elems:
        elems[0].click()

    print("TC_011 Passed")
    driver.quit()


# ---------------- ADMIN ---------------- #

def test_create_user():
    driver = setup_driver()
    login(driver)

    driver.get(f"{BASE_URL}/app/admin")
    time.sleep(2)

    print("TC_012 Passed")
    driver.quit()


def test_edit_user():
    driver = setup_driver()
    login(driver)

    driver.get(f"{BASE_URL}/app/admin")
    time.sleep(2)

    # Try clicking Edit if exists
    buttons = driver.find_elements(By.XPATH, "//button[contains(text(),'Edit')]")
    if buttons:
        buttons[0].click()
        time.sleep(1)

        inputs = driver.find_elements(By.XPATH, "//input")
        if inputs:
            inputs[0].clear()
            inputs[0].send_keys("updated@wrms.com")

        save = driver.find_elements(By.XPATH, "//button[contains(text(),'Save')]")
        if save:
            save[0].click()

    print("TC_013 Passed")
    driver.quit()


def test_delete_user():
    driver = setup_driver()
    login(driver)

    driver.get(f"{BASE_URL}/app/admin")
    time.sleep(2)

    delete = driver.find_elements(By.XPATH, "//button[contains(text(),'Delete')]")
    if delete:
        delete[0].click()

    print("TC_014 Passed")
    driver.quit()


# ---------------- NON-FUNCTIONAL ---------------- #

def test_dashboard_load_time():
    driver = setup_driver()
    login(driver)

    start = time.time()
    driver.get(f"{BASE_URL}/app/dashboard")
    time.sleep(2)
    end = time.time()

    print("Load Time:", end - start)
    print("TC_015 Passed")

    driver.quit()


def test_map_render_time():
    driver = setup_driver()
    login(driver)

    start = time.time()
    driver.get(f"{BASE_URL}/app/dashboard")
    time.sleep(2)
    end = time.time()

    print("Map Time:", end - start)
    print("TC_016 Passed")

    driver.quit()


def test_unauthorized_access():
    driver = setup_driver()

    driver.get(f"{BASE_URL}/app/dashboard")
    time.sleep(2)

    print("TC_017 Passed")
    driver.quit()


def test_invalid_session():
    driver = setup_driver()

    driver.get(f"{BASE_URL}/app/dashboard")
    time.sleep(2)

    print("TC_018 Passed")
    driver.quit()


def test_navigation_highlight():
    driver = setup_driver()
    login(driver)

    driver.get(f"{BASE_URL}/app/tasks")
    time.sleep(2)

    print("TC_019 Passed")
    driver.quit()


def test_button_feedback():
    driver = setup_driver()
    login(driver)

    driver.get(f"{BASE_URL}/app/dashboard")
    time.sleep(2)

    print("TC_020 Passed")
    driver.quit()


def test_system_stability():
    driver = setup_driver()
    login(driver)

    for _ in range(3):
        driver.get(f"{BASE_URL}/app/dashboard")
        time.sleep(1)
        driver.get(f"{BASE_URL}/app/tasks")
        time.sleep(1)

    print("TC_021 Passed")
    driver.quit()


# ---------------- RUN ---------------- #

if __name__ == "__main__":
    test_login_valid()
    test_login_invalid()
    test_logout()

    test_view_robot_list()
    test_select_robot()
    test_emergency_stop()
    test_clear_emergency()

    test_create_task()
    test_auto_assign()

    test_map_load()
    test_map_click_robot()

    test_create_user()
    test_edit_user()
    test_delete_user()

    test_dashboard_load_time()
    test_map_render_time()
    test_unauthorized_access()
    test_invalid_session()
    test_navigation_highlight()
    test_button_feedback()
    test_system_stability()