import os

def write_file_paths(root_path, output_file="file_list.txt"):
    root_path = os.path.abspath(root_path)
    output_path = os.path.join(root_path, output_file)

    with open(output_path, "w", encoding="utf-8") as f:
        for root, dirs, files in os.walk(root_path):
            for file in files:
                full_path = os.path.join(root, file)

                # 避免把輸出檔案自己寫進去
                if os.path.abspath(full_path) != os.path.abspath(output_path):
                    f.write(full_path + "\n")

    print("完成！已建立檔案：", output_path)


if __name__ == "__main__":
    folder_path = input("請輸入資料夾路徑：").strip()

    if os.path.isdir(folder_path):
        write_file_paths(folder_path)
    else:
        print("錯誤：資料夾不存在")