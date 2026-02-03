# Nexis-Lisp 文档

## 概述

Nexis-Lisp 是一个用 JavaScript 实现的教学性 Lisp 方言，支持宏、高阶函数和函数式编程范式。它设计简洁，易于理解和扩展。

## 快速开始

### 在线尝试
访问 [Nexis-Lisp 在线环境]() 即可开始编写代码。

### 本地运行
```bash
git clone <repository-url>
cd nexis-lisp
npm install
# 启动开发服务器
npm start
```

## 语法基础

### 表达式结构
Nexis-Lisp 使用前缀表示法，所有表达式都放在括号中：
```lisp
[函数 参数1 参数2 ...]
```

### 注释
使用分号开始单行注释：
```lisp
; 这是一个注释
[+ 1 2] ; 这是加法运算
```

## 数据类型

### 数值
```lisp
42      ; 整数
3.14    ; 浮点数
-10     ; 负数
```

### 字符串
```lisp
"hello world"
"字符串可以包含转义字符：\n\t\\\""
```

### 布尔值
```lisp
true
false
```

### 列表
```lisp
[list 1 2 3]           ; 创建列表
[]                     ; 空列表
null                   ; 也表示空列表
```

### 符号
```lisp
x                      ; 变量名
+                      ; 运算符
my-function            ; 函数名
```

## 基本运算

### 算术运算
```lisp
[+ 1 2 3]              ; => 6
[- 10 5]               ; => 5
[* 2 3 4]              ; => 24
[/ 20 4]               ; => 5
[mod 10 3]             ; => 1
```

### 比较运算
```lisp
[= 5 5]                ; => true
[!= 5 3]               ; => true
[> 10 5]               ; => true
[< 3 7]                ; => true
[>= 5 5]               ; => true
[<= 4 6]               ; => true
```

### 逻辑运算
```lisp
[not true]             ; => false
[and true false]       ; => false
[or true false]        ; => true
```

## 变量与作用域

### 定义变量
```lisp
[def x 10]             ; 定义全局变量
[set x 20]             ; 修改变量值
```

### 局部绑定
```lisp
[let [[x 1] [y 2]]     ; 局部绑定 x=1, y=2
  [+ x y]]             ; => 3
```

## 函数

### 定义函数
```lisp
[def square [fn [x]    ; 定义函数
  [* x x]]]

[square 5]             ; => 25
```

### 匿名函数
```lisp
[[fn [x] [* x x]] 3]   ; => 9
```

### 高阶函数示例
```lisp
[def apply-twice [fn [f x]
  [f [f x]]]]

[apply-twice [fn [n] [* n 2]] 3]   ; => 12
```

## 控制结构

### 条件判断
```lisp
[if [> x 0]
  "正数"                ; 条件为真时执行
  "非正数"]             ; 条件为假时执行
```

### 多条件分支
```lisp
[cond
  [[> x 10] "很大"]
  [[> x 5]  "中等"]
  [else     "很小"]]
```

### 循环
```lisp
[def x 0]
[while [< x 5]
  [print x]
  [set x [+ x 1]]]     ; 打印 0 1 2 3 4
```

## 列表操作

### 基本操作
```lisp
[list 1 2 3]           ; 创建列表
[cons 0 [list 1 2]]    ; => [0 1 2]
[first [list 1 2 3]]   ; => 1
[rest [list 1 2 3]]    ; => [2 3]
[len [list 1 2 3]]     ; => 3
```

### 列表函数
```lisp
[append [list 1 2] [list 3 4]]     ; => [1 2 3 4]
[reverse [list 1 2 3]]             ; => [3 2 1]
```

### 递归处理列表
```lisp
[def sum-list [fn [xs]
  [if [null? xs]
    0
    [+ [first xs] [sum-list [rest xs]]]]]

[sum-list [list 1 2 3 4 5]]        ; => 15
```

## 宏系统

### 宏基础
宏允许在编译时转换代码，提供元编程能力：
```lisp
[macro 宏名 [参数模式] 宏体]
```

### 简单宏示例
```lisp
[macro unless [cond & body]
  [q [cond [~cond 0] [else [do ~@body]]]]]

[unless [= x 0]
  [print "x 不是零"]]
```

### 中缀宏
```lisp
[macro infix [a op b]
  [q [~op ~a ~b]]]

[infix 1 + 2]          ; => 3
[infix 10 * [infix 2 + 3]]  ; => 50
```

### for 循环宏
```lisp
[macro for [[var in seq] & body]
  [q [do
    [def temp-seq ~seq]
    [while [not [null? temp-seq]]
      [def ~var [first temp-seq]]
      ~@body
      [set temp-seq [rest temp-seq]]]
    null]]]

[for [n in [list 1 2 3]]
  [print n]]            ; 打印 1 2 3
```

### 宏参数模式
- 普通参数：`x`
- 关键字参数：`in`（必须匹配）
- 可变参数：`& body`（收集剩余参数）
- 嵌套模式：`[x in seq]`

### 宏展开语法
- `~param`：替换为参数值
- `~@param`：展开列表参数
- `[quote ...]` 或 `'...`：引用表达式
- 简写：`q` 是 `quote` 的别名

## 内置函数参考

### 类型判断
```lisp
[number? 42]           ; => true
[string? "hello"]      ; => true
[list? [list 1 2]]     ; => true
[symbol? x]            ; => true
[boolean? true]        ; => true
[null? null]           ; => true
[null? []]             ; => true
```

### 数学函数
```lisp
[sqrt 16]              ; => 4
[abs -5]               ; => 5
[sin 0]                ; => 0
[cos 0]                ; => 1
[tan 0]                ; => 0
[log 10]               ; => 2.302585092994046
[exp 1]                ; => 2.718281828459045
[pow 2 3]              ; => 8
```

### 输入输出
```lisp
[print "Hello" "World"]  ; 打印 "Hello World"
[cat "hello" " " "world"] ; => "hello world"
```

## 标准库示例

### 映射函数
```lisp
[def map [fn [f xs]
  [if [null? xs]
    null
    [cons [f [first xs]] [map f [rest xs]]]]]]

[map [fn [x] [* x x]] [list 1 2 3 4]]  ; => [1 4 9 16]
```

### 过滤函数
```lisp
[def filter [fn [pred xs]
  [cond
    [[null? xs] null]
    [[pred [first xs]] [cons [first xs] [filter pred [rest xs]]]]
    [else [filter pred [rest xs]]]]]

[filter [fn [x] [> x 0]] [list -2 -1 0 1 2]]  ; => [1 2]
```

### 归约函数
```lisp
[def reduce [fn [f init xs]
  [if [null? xs]
    init
    [reduce f [f init [first xs]] [rest xs]]]]]

[reduce + 0 [list 1 2 3 4]]          ; => 10
[reduce * 1 [list 1 2 3 4]]          ; => 24
```

## 高级主题

### 闭包
```lisp
[def make-counter [fn []
  [let [[count 0]]
    [fn [] 
      [set count [+ count 1]]
      count]]]

[def counter [make-counter]]
[counter]              ; => 1
[counter]              ; => 2
```

### 惰性求值
```lisp
[def lazy-range [fn [start end]
  [fn []
    [if [< start end]
      [let [[current start]]
        [set start [+ start 1]]
        current]
      null]]]

[def range [lazy-range 1 5]]
[range]                ; => 1
[range]                ; => 2
```

### 错误处理
当前版本主要通过错误消息报告问题：
```lisp
[+ 1 "string"]         ; 错误：期望数值参数
[未定义变量]           ; 错误：未定义的变量
```

## REPL 使用指南

### 快捷键
- `Ctrl+Enter`：执行当前代码
- `↑/↓`：浏览历史记录
- `Tab`：插入缩进（2个空格）
- `Ctrl+L`：清除输出
- `Esc`：关闭模态框

### 环境面板
REPL 右侧显示当前环境中的所有绑定：
- 运算符：`+ - * /` 等
- 函数：内置函数和用户定义函数
- 宏：用户定义的宏
- 变量：当前定义的变量

### 示例代码
点击"示例"按钮可以查看和插入示例代码，按类别组织：
- 基本运算
- 变量与函数
- 控制结构
- 列表操作
- 宏编程
- 实用示例

## 常见模式

### 递归模式
```lisp
; 阶乘
[def factorial [fn [n]
  [if [= n 1]
    1
    [* n [factorial [- n 1]]]]]

; 斐波那契数列
[def fib [fn [n]
  [cond
    [[= n 0] 0]
    [[= n 1] 1]
    [else [+ [fib [- n 1]] [fib [- n 2]]]]]]
```

### 迭代模式
```lisp
; 使用 while
[def sum-to-n [fn [n]
  [let [[total 0] [i 1]]
    [while [<= i n]
      [set total [+ total i]]
      [set i [+ i 1]]]
    total]]
```

### 函数组合
```lisp
[def compose [fn [f g]
  [fn [x] [f [g x]]]]

[def add1 [fn [x] [+ x 1]]]
[def square [fn [x] [* x x]]]
[def add1-then-square [compose square add1]]
[add1-then-square 3]   ; => 16
```

## 故障排除

### 常见错误

1. **括号不匹配**
   ```
   错误：缺少匹配的 ]
   ```
   检查所有括号是否成对出现。

2. **未定义变量**
   ```
   错误：x 未定义
   ```
   确保变量已定义，或检查拼写。

3. **类型错误**
   ```
   错误：期望数值参数
   ```
   检查参数类型是否符合函数要求。

4. **宏展开错误**
   ```
   错误：未定义的宏参数
   ```
   检查宏参数模式是否正确。

### 调试技巧

1. 使用 `[print ...]` 输出中间值
2. 检查环境面板确认变量状态
3. 简化复杂表达式逐步测试
4. 使用 `[quote ...]` 查看表达式结构

## 扩展 Nexis-Lisp

### 添加内置函数
在 `evaluator.js` 的 `createGlobalEnvironment` 方法中添加：
```javascript
env.define('新函数', function(...args) {
  // 实现代码
});
```

### 修改语法
1. 在 `lexer.js` 中修改令牌模式
2. 在 `parser.js` 中修改语法分析逻辑
3. 在 `evaluator.js` 中添加特殊形式处理

### 创建新宏
参考现有宏的实现模式：
1. 定义参数模式
2. 编写宏体（使用 quote/unquote 语法）
3. 在宏展开器中实现展开逻辑

## 示例项目

### 计算器应用
```lisp
[def calc [fn [expr]
  [cond
    [[number? expr] expr]
    [[list? expr]
     [let [[op [first expr]] [args [rest expr]]]
       [apply op [map calc args]]]]
    [else expr]]]

[calc [+ 1 [* 2 3]]]   ; => 7
```

### 简单游戏
```lisp
[def guess-number [fn [secret]
  [let [[attempts 0]]
    [while true
      [print "猜一个数字: "]
      [let [[guess ...]]  ; 这里需要输入功能
        [set attempts [+ attempts 1]]
        [cond
          [[= guess secret] 
           [print "恭喜！你猜了" attempts "次"]
           [break]]
          [[> guess secret] [print "太大了"]]
          [else [print "太小了"]]]]]]]
```

## 许可证与贡献

Nexis-Lisp 是开源项目，欢迎贡献：
1. 报告问题
2. 提交功能请求
3. 贡献代码改进
4. 编写文档和示例

## 学习资源

### 进一步学习
- [Structure and Interpretation of Computer Programs](https://mitpress.mit.edu/sites/default/files/sicp/index.html)
- [The Little Schemer](https://mitpress.mit.edu/books/little-schemer)
- [On Lisp](https://paulgraham.com/onlisp.html)

### 相关项目
- [Scheme](https://www.scheme.org/)
- [Clojure](https://clojure.org/)
- [Racket](https://racket-lang.org/)

---

*最后更新：2024年1月*
*版本：4.0*