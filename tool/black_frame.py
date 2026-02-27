import cv2
import numpy as np
import os

def add_outline_and_save(file_path, thickness=10):
    # 讀取含 alpha 通道的圖片
    img = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)

    if img is None or img.shape[2] != 4:
        return

    # 分離 RGBA
    b, g, r, a = cv2.split(img)
    
    # 1. 先將原本的 Alpha 通道二值化，確保邊緣銳利
    _, mask = cv2.threshold(a, 1, 255, cv2.THRESH_BINARY)

    # 2. 建立膨脹 kernel（圓形 kernel 會讓邊角更圓滑，不像矩形那麼生硬）
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (thickness, thickness))

    # 3. 膨脹 mask
    dilated = cv2.dilate(mask, kernel, iterations=1)

    # 4. 【關鍵】計算 outline 並再次強制二值化，確保沒有灰色地帶
    outline = cv2.subtract(dilated, mask)
    _, outline = cv2.threshold(outline, 1, 255, cv2.THRESH_BINARY) # 這裡確保只有 0 或 255

    # 5. 合成結果
    result = img.copy()
    
    # 將 outline 區域設為黑色 (B,G,R=0)
    # 使用遮罩一次性處理，比 for 迴圈快且乾淨
    result[outline > 0] = [0, 0, 0, 255] 

    # 6. 最後將原始圖片疊加回去（確保原圖的半透明邊緣不會被外框吃掉）
    # 如果你想要整張圖都很硬派（無反鋸齒），這步可以省略
    
    # 覆蓋原檔
    cv2.imwrite(file_path, result)
    print(f"已處理 (純黑邊框): {file_path}")

def process_folder(folder_path, thickness=5):
    """遍歷資料夾中的所有 .png 檔案"""
    # 檢查資料夾是否存在
    if not os.path.exists(folder_path):
        print(f"錯誤：找不到資料夾 {folder_path}")
        return

    # 遍歷資料夾
    for filename in os.listdir(folder_path):
        # 只處理 PNG 檔案
        if filename.lower().startswith("chess1") and filename.lower().endswith(".png"):
            full_path = os.path.join(folder_path, filename)
            add_outline_and_save(full_path, thickness)

# --- 使用範例 ---
# 請將這裡的路徑改為你圖片所在的資料夾路徑
target_folder = r"D:\2.programm2\Game\Reversi\picture"
process_folder(target_folder, thickness=5)