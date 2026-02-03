// parser.js - 语法分析器

class Parser {
    constructor() {
        this.lexer = new Lexer();
    }

    /**
     * 解析单个表达式
     * @param {Array} tokens - 令牌数组
     * @param {number} startIndex - 起始索引
     * @returns {Array} [表达式, 新的索引]
     */
    parseExpression(tokens, startIndex = 0) {
        if (startIndex >= tokens.length) {
            throw new Error('意外的文件结尾');
        }
        
        let index = startIndex;
        const token = tokens[index];
        
        switch (token.type) {
            case 'LBRACKET':
                return this.parseList(tokens, index);
                
            case 'QUOTE':
                index++;
                const [expr, newIndex] = this.parseExpression(tokens, index);
                return [['quote' , expr], newIndex];
                
            case 'NUMBER':
                index++;
                return [parseFloat(token.value), index];
                
            case 'STRING':
                index++;
                //字符串要求解析转义字符并保留""
                return [this.lexer.parseStringLiteral(token.value), index];
                
            case 'SYMBOL':
                //符号不加引号返回
                const value = token.value;
                index++;

                // 处理特殊值
                if (value === 'true') {
                    return [true , index];
                } else if (value === 'false') {
                    return [false , index];
                } else if (value === 'null') {
                    return [null , index];
                }

                // 普通符号
                return [value, index];
                
            default:
                throw new Error(`意外的令牌类型: ${token.type} (值: "${token.value}")`);
        }
    }
    
    /**
     * 解析列表
     * @param {Array} tokens - 令牌数组
     * @param {number} startIndex - 起始索引
     * @returns {Array} [列表, 新的索引]
     */
    parseList(tokens, startIndex) {
        let index = startIndex;
        const startToken = tokens[index];
        
        if (startToken.type !== 'LBRACKET') {
            throw new Error(`期望 '['，但得到: ${startToken.type}`);
        }
        
        index++; // 跳过 '['
        const list = [];
        
        while (index < tokens.length && tokens[index].type !== 'RBRACKET') {
            const [expr, newIndex] = this.parseExpression(tokens, index);
            list.push(expr);
            index = newIndex;
        }
        
        if (index >= tokens.length) {
            throw new Error('缺少匹配的 ]');
        }
        
        index++; // 跳过 ']'
        return [list, index];
    }

    /**
     * 读取并解析整个输入
     * @param {string} input - 输入代码
     * @returns {Array} 解析后的AST[op p1 p2 ...]
     */
    read(input) {
        try {
            console.log('读取输入:', input);
            
            // 词法分析
            const tokens = this.lexer.tokenize(input);
            console.log('标记化结果:');
            this.lexer.printTokens(tokens);
            
            // 语法分析
            const expressions = [];
            let index = 0;
            
            while (index < tokens.length) {
                const [expr, newIndex] = this.parseExpression(tokens, index);
                expressions.push(expr);
                index = newIndex;
            }

            console.log('解析结果:', expressions);
            
            // 处理多个表达式
            if (expressions.length === 0) {
                return null;
            } else if (expressions.length === 1) {
                return expressions[0];
            } else {
                // 多个表达式包装成 do 表达式
                return ['do' , ...expressions];
            }
            
        } catch (error) {
            throw new Error(`解析错误: ${error.message}`);
        }
    }

    /**
     * 解析多个表达式
     * @param {string} input - 输入代码
     * @returns {Array} 表达式数组
     */
    readAll(input) {
        const tokens = this.lexer.tokenize(input);
        const expressions = [];
        let index = 0;
        
        while (index < tokens.length) {
            const [expr, newIndex] = this.parseExpression(tokens, index);
            expressions.push(expr);
            index = newIndex;
        }
        
        return expressions;
    }
}

// 导出解析器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Parser };
}