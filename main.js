// main.js - 主程序入口
document.addEventListener('DOMContentLoaded', () => {
    try {
        // 创建求值器和 REPL
        const evaluator = new Evaluator();
        const repl = new REPL(evaluator);
        
        // 预定义一些示例代码
        const predefinedCode = [
            '[def square [fn [x] [* x x]]]',
            '[def factorial [fn [n] [cond [[= n 0] 1] [else [* n [factorial [- n 1]]]]]]]',
            '[def fib [fn [n] [cond [[= n 0] 0] [[= n 1] 1] [else [+ [fib [- n 1]] [fib [- n 2]]]]]]]',
            '[macro when [cond & body] [q [if ~cond [do ~@body] nil]]]',
            '[macro unless [cond & body] [q [if ~cond nil [do ~@body]]]]'
        ];
        
        // 执行预定义代码
        setTimeout(() => {
            const parser = new Parser();
            predefinedCode.forEach(code => {
                try {
                    const ast = parser.read(code);
                    evaluator.eval(ast);
                } catch (e) {
                    console.warn('预定义代码执行失败:', e.message);
                }
            });
            repl.updateEnvironmentDisplay();
        }, 100);
        
        // 添加 CSS 样式
        const style = document.createElement('style');
        style.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            
            .examples-modal {
                background: var(--bg-color);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 20px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .examples-modal h3 {
                margin-top: 0;
                color: var(--primary-color);
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .examples-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 15px;
            }
            
            .example-item {
                padding: 12px;
                border: 1px solid var(--border-color);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .example-item:hover {
                background: var(--hover-color);
                transform: translateX(5px);
            }
            
            .example-code {
                font-family: 'Monaco', 'Consolas', monospace;
                color: var(--code-color);
                margin-bottom: 5px;
            }
            
            .example-desc {
                font-size: 0.9em;
                color: var(--text-secondary);
            }
            
            .env-group {
                margin-bottom: 15px;
            }
            
            .env-group h4 {
                margin: 0 0 8px 0;
                color: var(--text-secondary);
                font-size: 0.9em;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .env-empty {
                text-align: center;
                color: var(--text-secondary);
                padding: 20px;
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
        
        console.log('Nexis Lisp v2.0 已启动');
        
    } catch (error) {
        console.error('启动失败:', error);
        alert(`启动失败: ${error.message}`);
    }
});