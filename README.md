注意:
gunon順序問題是一個隱患
STATUS好像不能亂刪	
time_2A 要被包在300中

流程:
place
updateBoard
moveResult

代辦:
move 初始問題 0(300)	0
計分欄影響到點擊 0
多個子的總延遲增加 0
落子太慢 place問題 turn 0
對方下太快會出現錯誤 server調整 0
更改(非placeidx)造成沒有POP動畫 false false 0
衝擊波問題1無多有  x
動畫播完才可以開始下棋 0
如果位置太下面槍管要往上可以上下都用一num調整\如果是負數就不調整 0
解決下的太快的問題(造成空白下級以及卡死) 0
解決gun的積分延遲 0
分數沒有刪除 x(某個翻轉所造成的gun錯誤)
我下完之后還是綠色(DIGIT上一個無刪除，電腦下太快?) 0 (378row)
增加新turn在翻轉動畫時都雙方都不能點
需要turn的client: updateboard place
