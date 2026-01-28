from torchvision import datasets
import os
from PIL import Image

# 下載 MNIST (會自動存到當前資料夾 ./MNIST)
mnist = datasets.MNIST(root=".", train=True, download=True)

# 輸出資料夾
output_dir = "digits"
os.makedirs(output_dir, exist_ok=True)

# 每個數字只存一些 (避免太大)，你可以改成更大數量
limit_per_digit = 200  

counters = {i: 0 for i in range(10)}

for idx, (img, label) in enumerate(mnist):
    if counters[label] >= limit_per_digit:
        continue

    # 轉成 RGBA
    img = img.convert("RGBA")

    # 去背：把黑色轉透明
    datas = img.getdata()
    new_data = []
    for item in datas:
        # item = (r, g, b, a)，MNIST 是灰階但轉 RGBA 了
        if item[0] < 50 and item[1] < 50 and item[2] < 50:
            # 接近黑色 => 透明
            new_data.append((0, 0, 0, 0))
        else:
            # 白色字 => 保留
            new_data.append(item)

    img.putdata(new_data)

    # 存檔
    digit_folder = os.path.join(output_dir, str(label))
    os.makedirs(digit_folder, exist_ok=True)
    filename = os.path.join(digit_folder, f"{counters[label]}.png")
    img.save(filename, "PNG")

    counters[label] += 1

    # 如果 0-9 都存滿，就停
    if all(counters[d] >= limit_per_digit for d in range(10)):
        break

print("✅ 已完成 MNIST 去背數字存檔！")
