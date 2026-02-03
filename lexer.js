// lexer.js - 词法分析器
class Lexer {
    constructor() {
        // 令牌模式定义
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

    /**
     * 将输入字符串转换为令牌数组
     * @param {string} input - 输入代码
     * @returns {Array} 令牌数组
     */
    tokenize(input) {
        const tokens = [];
        let pos = 0;
        
        while (pos < input.length) {
            let matched = false;
            
            // 尝试匹配所有令牌模式
            for (const { type, pattern } of this.tokenPatterns) {
                const match = input.slice(pos).match(pattern);
                if (match) {
                    // 忽略空白和注释
                    if (type !== 'WHITESPACE' && type !== 'COMMENT') {
                        tokens.push({ 
                            type, 
                            value: match[0],
                            position: pos 
                        });
                    }
                    pos += match[0].length;
                    matched = true;
                    break;
                }
            }
            
            if (!matched) {
                throw new Error(`无法识别的字符: '${input[pos]}' (位置: ${pos})`);
            }
        }
        
        return tokens;
    }

    /**
     * 解析字符串字面量
     * @param {string} strLiteral - 原始字符串字面量
     * @returns {string} 解析后的字符串
     */
    parseStringLiteral(strLiteral) {
        const content = strLiteral;
        
        // 处理转义字符
        let result = '';
        for (let i = 0; i < content.length; i++) {
            if (content[i] === '\\' && i + 1 < content.length) {
                const nextChar = content[i + 1];
                switch (nextChar) {
                    case 'n': result += '\n'; break;
                    case 't': result += '\t'; break;
                    case 'r': result += '\r'; break;
                    case '"': result += '"'; break;
                    case '\\': result += '\\'; break;
                    default: result += nextChar; // 保持原样
                }
                i++; // 跳过已处理的转义字符
            } else {
                result += content[i];
            }
        }
        
        return result;
    }

    /**
     * 打印令牌信息（调试用）
     * @param {Array} tokens - 令牌数组
     */
    printTokens(tokens) {
        console.log('Tokens:');
        tokens.forEach((token, i) => {
            console.log(`  [${i}] ${token.type}: "${token.value}"`);
        });
    }
}

// 导出词法分析器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Lexer };
}