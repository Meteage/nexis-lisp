// parser.js - 修复版本，支持多表达式
class Parser {
    constructor() {
        this.tokenPatterns = [
            { type: 'WHITESPACE', pattern: /^\s+/ },
            { type: 'COMMENT', pattern: /^;[^\n]*/ },
            { type: 'NUMBER', pattern: /^-?\d+(\.\d+)?/ },
            { type: 'STRING', pattern: /^"([^"\\]|\\.)*"/ },
            { type: 'SYMBOL', pattern: /^[^\s\[\]\{\}\(\)"';]+/ },
            { type: 'QUOTE', pattern: /^'/ },
            { type: 'LBRACKET', pattern: /^\[/ },
            { type: 'RBRACKET', pattern: /^\]/ }
        ];
    }

    tokenize(input) {
        const tokens = [];
        let pos = 0;
        
        while (pos < input.length) {
            let matched = false;
            
            for (const { type, pattern } of this.tokenPatterns) {
                const match = input.slice(pos).match(pattern);
                if (match) {
                    if (type !== 'WHITESPACE' && type !== 'COMMENT') {
                        tokens.push({ type, value: match[0] });
                    }
                    pos += match[0].length;
                    matched = true;
                    break;
                }
            }
            
            if (!matched) {
                throw new Error(`无法识别的字符: ${input[pos]}`);
            }
        }
        
        return tokens;
    }

    parseExpression(tokens, startIndex = 0) {
        let index = startIndex;
        
        if (index >= tokens.length) {
            throw new Error('意外的结束');
        }
        
        const token = tokens[index];
        
        if (token.type === 'LBRACKET') {
            return this.parseList(tokens, index);
        } else if (token.type === 'QUOTE') {
            index++;
            const [expr, newIndex] = this.parseExpression(tokens, index);
            return [['quote', expr], newIndex];
        } else if (token.type === 'NUMBER') {
            index++;
            return [parseFloat(token.value), index];
        } else if (token.type === 'STRING') {
            index++;
            return [token.value.slice(1, -1), index];
        } else if (token.type === 'SYMBOL') {
            index++;
            return [token.value, index];
        } else {
            throw new Error(`意外的 token: ${token.type}`);
        }
    }
    
    parseList(tokens, startIndex) {
        let index = startIndex;
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

    read(input) {
        try {
            const tokens = this.tokenize(input);
            const expressions = [];
            let index = 0;
            
            while (index < tokens.length) {
                const [expr, newIndex] = this.parseExpression(tokens, index);
                expressions.push(expr);
                index = newIndex;
            }
            
            // 如果只有一个表达式，直接返回它
            // 如果有多个表达式，返回一个 do 表达式
            if (expressions.length === 0) {
                return null;
            } else if (expressions.length === 1) {
                return expressions[0];
            } else {
                return ['do', ...expressions];
            }
            
        } catch (error) {
            throw new Error(`解析错误: ${error.message}`);
        }
    }
}

// 导出解析器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Parser };
}