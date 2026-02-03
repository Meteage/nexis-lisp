// macro-expander.js - 更新以处理 ampersand 语法
class MacroExpander {
    constructor() {
        this.debugLevel = 0;
    }

    log(level, ...args) {
        if (this.debugLevel >= level) {
            console.log(...args);
        }
    }

    /**
     * 展开宏调用
     */
    expandMacro(macro, args) {
        this.log(2, `展开宏开始`);
        this.log(2, `宏参数模式: ${JSON.stringify(macro.params)}`);
        this.log(2, `实际参数: ${JSON.stringify(args)}`);
        
        const { body, params } = macro;
        
        // 绑定参数
        const paramMap = this.bindMacroParameters(params, args);
        this.log(2, `参数绑定结果: ${JSON.stringify(paramMap)}`);
        
        // 展开宏体
        const expanded = this.expandMacroBody(body, paramMap);
        this.log(2, `宏体展开结果: ${JSON.stringify(expanded)}`);
        
        return expanded;
    }
    
    /**
     * 绑定宏参数 - 现在处理 ampersand 语法
     */
    bindMacroParameters(paramPattern, args) {
        this.log(3, `绑定参数: pattern=${JSON.stringify(paramPattern)}, args=${JSON.stringify(args)}`);
        const paramMap = {};
        
        let patternIndex = 0;
        let argIndex = 0;
        const patternLen = paramPattern.length;
        const argLen = args.length;
        
        while (patternIndex < patternLen && argIndex < argLen) {
            const patternElem = paramPattern[patternIndex];
            this.log(3, `  处理模式元素[${patternIndex}]: ${JSON.stringify(patternElem)}`);
            
            // 处理 ampersand 参数（可变参数）
            if (Array.isArray(patternElem) && patternElem[0] === 'ampersand') {
                const restParam = patternElem[1];
                this.log(3, `  找到可变参数: ${restParam}`);
                patternIndex++;
                
                // 收集剩余的所有参数
                const restArgs = args.slice(argIndex);
                this.log(3, `  剩余参数: ${JSON.stringify(restArgs)}`);
                
                paramMap[restParam] = restArgs;
                this.log(3, `  绑定可变参数 ${restParam} = ${JSON.stringify(restArgs)}`);
                
                // 处理完可变参数后，所有剩余参数都被消耗了
                argIndex = argLen;
                continue;
            }
            
            const argElem = args[argIndex];
            this.log(3, `  对应实参[${argIndex}]: ${JSON.stringify(argElem)}`);
            
            if (Array.isArray(patternElem)) {
                // 嵌套模式
                if (!Array.isArray(argElem)) {
                    throw new Error(`期望列表参数，实际: ${argElem}`);
                }
                
                // 递归处理嵌套模式
                this.log(3, `  嵌套模式，递归绑定`);
                const nestedMap = this.bindMacroParameters(patternElem, argElem);
                Object.assign(paramMap, nestedMap);
                this.log(3, `  嵌套绑定结果: ${JSON.stringify(nestedMap)}`);
            } else {
                // 普通参数绑定
                paramMap[patternElem] = argElem;
                this.log(3, `  绑定参数 ${patternElem} = ${JSON.stringify(argElem)}`);
            }
            
            patternIndex++;
            argIndex++;
        }
        
        this.log(3, `绑定完成，paramMap: ${JSON.stringify(paramMap)}`);
        return paramMap;
    }
    
    /**
     * 展开宏体 - 现在处理新的语法形式
     */
    expandMacroBody(expr, paramMap, depth = 0) {
        const indent = '  '.repeat(depth);
        this.log(3, `${indent}展开宏体: ${JSON.stringify(expr)}`);
        
        // 处理 quote 表达式
        if (Array.isArray(expr) && expr[0] === 'quote') {
            const quotedExpr = expr[1];
            this.log(3, `${indent}处理 quote: ${JSON.stringify(quotedExpr)}`);
            
            // 展开 quote 内部的内容
            const expandedQuoted = this.expandInQuote(quotedExpr, paramMap, depth + 1);
            return ['quote', expandedQuoted];
        }
        
        // 处理 unquote 表达式
        if (Array.isArray(expr) && expr[0] === 'unquote') {
            const paramName = expr[1];
            this.log(3, `${indent}处理 unquote: ${paramName}`);
            
            if (typeof paramName !== 'string') {
                throw new Error(`unquote 参数必须是符号`);
            }
            
            const value = paramMap[paramName];
            if (value === undefined) {
                throw new Error(`未定义的宏参数: ${paramName}`);
            }
            
            this.log(3, `${indent}unquote ${paramName} -> ${JSON.stringify(value)}`);
            return value;
        }
        
        // 处理 unquote-at 表达式
        if (Array.isArray(expr) && expr[0] === 'unquote-at') {
            const paramName = expr[1];
            this.log(3, `${indent}处理 unquote-at: ${paramName}`);
            
            if (typeof paramName !== 'string') {
                throw new Error(`unquote-at 参数必须是符号`);
            }
            
            const value = paramMap[paramName];
            if (value === undefined) {
                throw new Error(`未定义的宏参数: ${paramName}`);
            }
            
            this.log(3, `${indent}unquote-at ${paramName} -> ${JSON.stringify(value)}`);
            
            // 返回特殊的展开标记
            return { _type: 'unquote-at', value };
        }
        
        // 处理列表
        if (Array.isArray(expr)) {
            const result = [];
            
            for (let i = 0; i < expr.length; i++) {
                const item = expr[i];
                const expanded = this.expandMacroBody(item, paramMap, depth + 1);
                
                // 处理 unquote-at 展开
                if (expanded && expanded._type === 'unquote-at') {
                    const spliceValue = expanded.value;
                    if (Array.isArray(spliceValue)) {
                        for (const elem of spliceValue) {
                            result.push(elem);
                        }
                    } else {
                        result.push(spliceValue);
                    }
                } else {
                    result.push(expanded);
                }
            }
            
            return result;
        }
        
        // 处理字符串（符号） - 直接返回，不再处理 ~ 符号
        // 因为 ~ 和 ~@ 现在通过 unquote/unquote-at 语法处理
        if (typeof expr === 'string') {
            return expr;
        }
        
        // 其他值（数字、布尔值等）
        return expr;
    }
    
    /**
     * 展开 quote 内部的表达式
     */
    expandInQuote(expr, paramMap, depth = 0) {
        const indent = '  '.repeat(depth);
        this.log(3, `${indent}expandInQuote: ${JSON.stringify(expr)}`);
        
        // 处理列表
        if (Array.isArray(expr)) {
            const result = [];
            
            for (let i = 0; i < expr.length; i++) {
                const item = expr[i];
                
                // 检查是否是 unquote 或 unquote-at
                if (Array.isArray(item)) {
                    if (item[0] === 'unquote') {
                        const paramName = item[1];
                        const value = paramMap[paramName];
                        if (value !== undefined) {
                            result.push(value);
                        } else {
                            result.push(item);
                        }
                    } else if (item[0] === 'unquote-at') {
                        const paramName = item[1];
                        const value = paramMap[paramName];
                        if (value !== undefined) {
                            if (Array.isArray(value)) {
                                for (const elem of value) {
                                    result.push(elem);
                                }
                            } else {
                                result.push(value);
                            }
                        } else {
                            result.push(item);
                        }
                    } else {
                        // 递归处理嵌套列表
                        result.push(this.expandInQuote(item, paramMap, depth + 1));
                    }
                } else {
                    result.push(item);
                }
            }
            
            return result;
        }
        
        // 处理字符串（符号）或其他值
        return expr;
    }
}

// 测试代码
if (typeof require !== 'undefined' && require.main === module) {
    const expander = new MacroExpander();
    expander.debugLevel = 2;
    
    console.log('=== 测试新的宏展开器（支持 ampersand 语法）===\n');
    
    // 测试你的宏定义 - 现在参数模式使用 ampersand 语法
    const forMacro = {
        params: [['x', 'in', 'seq'], ['ampersand', 'body']],  // 注意：现在是 ['ampersand', 'body']
        body: ['quote', ['do',
            ['def', 'temp-seq', ['unquote', 'seq']],
            ['while', ['not', ['null?', 'temp-seq']],
                ['def', ['unquote', 'x'], ['first', 'temp-seq']],
                ['unquote-at', 'body'],
                ['set', 'temp-seq', ['rest', 'temp-seq']]
            ],
            'null'
        ]]
    };
    
    const macroArgs = [
        ['n', 'in', ['list', 1, 2, 3]],
        ['print', 'n']
    ];
    
    console.log('宏定义:', JSON.stringify(forMacro, null, 2));
    console.log('宏参数:', JSON.stringify(macroArgs, null, 2));
    
    try {
        const expanded = expander.expandMacro(forMacro, macroArgs);
        console.log('\n展开结果:', JSON.stringify(expanded, null, 2));
        
    } catch (error) {
        console.error('展开错误:', error.message);
        console.error(error.stack);
    }
}

// 导出宏展开器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MacroExpander };
}