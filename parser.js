// parser.js - 词法分析和语法解析
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

    parse(tokens) {
        let index = 0;
        
        const parseExpression = () => {
            if (index >= tokens.length) {
                throw new Error('意外的结束');
            }
            
            const token = tokens[index];
            
            if (token.type === 'LBRACKET') {
                return parseList();
            } else if (token.type === 'QUOTE') {
                index++;
                return ['quote', parseExpression()];
            } else if (token.type === 'NUMBER') {
                index++;
                return parseFloat(token.value);
            } else if (token.type === 'STRING') {
                index++;
                return token.value.slice(1, -1); // 移除引号
            } else if (token.type === 'SYMBOL') {
                index++;
                return token.value;
            } else {
                throw new Error(`意外的 token: ${token.type}`);
            }
        };
        
        const parseList = () => {
            index++; // 跳过 '['
            const list = [];
            
            while (index < tokens.length && tokens[index].type !== 'RBRACKET') {
                list.push(parseExpression());
            }
            
            if (index >= tokens.length) {
                throw new Error('缺少匹配的 ]');
            }
            
            index++; // 跳过 ']'
            return list;
        };
        
        return parseExpression();
    }

    read(input) {
        try {
            const tokens = this.tokenize(input);
            const ast = this.parse(tokens);
            return ast;
        } catch (error) {
            throw new Error(`解析错误: ${error.message}`);
        }
    }
}

// 导出解析器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Parser };
}