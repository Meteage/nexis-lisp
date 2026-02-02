// repl.js - 修复版本
class REPL {
    constructor(evaluator) {
        this.evaluator = evaluator;
        this.history = JSON.parse(localStorage.getItem('nexis_history') || '[]');
        this.historyIndex = -1;
        this.init();
    }

    init() {
        this.output = document.getElementById('output');
        this.input = document.getElementById('input');
        this.envDisplay = document.getElementById('env-display');
        this.clearBtn = document.getElementById('clear-btn');
        this.evalBtn = document.getElementById('eval-btn');
        this.examplesBtn = document.getElementById('examples-btn');

        this.setupEventListeners();
        this.updateEnvironmentDisplay();
    }

    setupEventListeners() {
        // 执行按钮
        this.evalBtn.addEventListener('click', () => this.execute());
        
        // 清除按钮
        this.clearBtn.addEventListener('click', () => this.clearOutput());
        
        // 示例按钮
        this.examplesBtn.addEventListener('click', () => this.showExamples());
        
        // 输入框事件
        this.input.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.execute();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1);
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.insertTab();
            }
        });
        
        // 自动调整输入框高度
        this.input.addEventListener('input', () => {
            this.adjustInputHeight();
        });
        
        // 示例代码点击
        document.querySelectorAll('.example').forEach(example => {
            example.addEventListener('click', (e) => {
                const code = example.getAttribute('data-code');
                this.input.value = code;
                this.adjustInputHeight();
                this.input.focus();
            });
        });
    }

    insertTab() {
        const start = this.input.selectionStart;
        const end = this.input.selectionEnd;
        const text = this.input.value;
        
        this.input.value = text.substring(0, start) + '    ' + text.substring(end);
        this.input.selectionStart = this.input.selectionEnd = start + 4;
        this.adjustInputHeight();
    }

    adjustInputHeight() {
        this.input.style.height = 'auto';
        this.input.style.height = Math.min(this.input.scrollHeight, 200) + 'px';
    }

    navigateHistory(direction) {
        if (this.history.length === 0) return;
        
        this.historyIndex += direction;
        
        if (this.historyIndex < 0) {
            this.historyIndex = -1;
            this.input.value = '';
        } else if (this.historyIndex >= this.history.length) {
            this.historyIndex = this.history.length - 1;
        } else {
            this.input.value = this.history[this.historyIndex];
        }
        
        this.adjustInputHeight();
    }

    execute() {
        const code = this.input.value.trim();
        if (!code) return;
        
        // 添加到历史记录
        this.addToHistory(code);
        
        // 显示输入
        this.addOutputLine(code, 'input');
        
        try {
            // 解析和求值
            const parser = new Parser();
            const ast = parser.read(code);
            
            // 调试信息
            console.log('解析结果:', ast);
            
            const result = this.evaluator.eval(ast);
            
            // 显示结果
            this.addOutputLine(this.formatResult(result), 'output');
            
            // 更新环境显示
            this.updateEnvironmentDisplay();
            
        } catch (error) {
            console.error('执行错误:', error);
            this.addOutputLine(`错误: ${error.message}`, 'error');
        }
        
        // 清空输入框
        this.input.value = '';
        this.adjustInputHeight();
        this.input.focus();
    }

    addToHistory(code) {
        // 移除重复项
        const index = this.history.indexOf(code);
        if (index > -1) {
            this.history.splice(index, 1);
        }
        
        this.history.unshift(code);
        
        // 只保留最近50条记录
        if (this.history.length > 50) {
            this.history.pop();
        }
        
        localStorage.setItem('nexis_history', JSON.stringify(this.history));
        this.historyIndex = -1;
    }

    addOutputLine(text, type = 'output') {
        const line = document.createElement('div');
        line.className = `output-line ${type}`;
        
        const prompt = document.createElement('span');
        prompt.className = 'prompt';
        prompt.textContent = type === 'input' ? 'Nexis>' : '=>';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'output-text';
        textSpan.textContent = text;
        
        line.appendChild(prompt);
        line.appendChild(textSpan);
        this.output.appendChild(line);
        
        // 滚动到底部
        this.output.scrollTop = this.output.scrollHeight;
    }

    formatResult(result) {
        if (typeof result === 'number') {
            return result.toString();
        } else if (typeof result === 'string') {
            return `"${result}"`;
        } else if (Array.isArray(result)) {
            return `[${result.map(this.formatResult.bind(this)).join(' ')}]`;
        } else if (typeof result === 'function') {
            return '#<function>';
        } else if (result && result.type === 'macro') {
            return '#<macro>';
        } else if (result === null || result === undefined) {
            return 'null';
        } else {
            return String(result);
        }
    }

    clearOutput() {
        this.output.innerHTML = '';
        this.addOutputLine('输出已清除', 'info');
    }

    showExamples() {
        // 创建示例对话框
        const examples = [
            { code: '[+ 1 2 3 4]', desc: '加法运算' },
            { code: '[* 5 6]', desc: '乘法运算' },
            { code: '[def pi 3.14159]', desc: '定义变量' },
            { code: '[def circle-area [fn [r] [* pi [* r r]]]]', desc: '定义函数' },
            { code: '[circle-area 10]', desc: '调用函数' },
            { code: '[cond [[> 5 3] "greater"] [else "less"]]', desc: '条件判断' },
            { code: '[let [[x 10] [y 20]] [+ x y]]', desc: '局部绑定' },
            { code: '[macro infix [a op b] [q [~op ~a ~b]]]', desc: '定义中缀宏' },
            { code: '[infix 1 + 2]', desc: '使用中缀宏' },
            { code: '[macro unless [cond & body] [q [cond [~cond 0] [else [do ~@body]]]]]', desc: '定义 unless 宏' },
            { code: '[def x 5] [unless [= x 0] [print "x is not zero"]]', desc: '使用 unless 宏' }
        ];
        
        let examplesHTML = '<div class="examples-modal">';
        examplesHTML += '<h3><i class="fas fa-list"></i> 代码示例</h3>';
        examplesHTML += '<div class="examples-list">';
        
        examples.forEach(example => {
            examplesHTML += `
                <div class="example-item">
                    <div class="example-code">${example.code}</div>
                    <div class="example-desc">${example.desc}</div>
                </div>
            `;
        });
        
        examplesHTML += '</div></div>';
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = examplesHTML;
        
        // 点击示例插入代码
        modal.querySelectorAll('.example-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.input.value = examples[index].code;
                this.adjustInputHeight();
                this.input.focus();
                modal.remove();
            });
        });
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }

    updateEnvironmentDisplay() {
        const bindings = this.evaluator.getEnvironmentBindings();
        
        // 分组显示
        const builtins = bindings.filter(b => b.type === '内置函数' && /^[+\-*/<>=]/.test(b.key));
        const functions = bindings.filter(b => b.type === '内置函数' && !/^[+\-*/<>=]/.test(b.key));
        const macros = bindings.filter(b => b.type === '宏');
        const variables = bindings.filter(b => !['内置函数', '宏'].includes(b.type));
        
        let html = '';
        
        // 内置运算符
        if (builtins.length > 0) {
            html += '<div class="env-group"><h4>运算符</h4>';
            builtins.forEach(b => {
                html += `<div class="env-item"><span class="env-key">${b.key}</span><span class="env-value">${b.type}</span></div>`;
            });
            html += '</div>';
        }
        
        // 内置函数
        if (functions.length > 0) {
            html += '<div class="env-group"><h4>函数</h4>';
            functions.forEach(b => {
                html += `<div class="env-item"><span class="env-key">${b.key}</span><span class="env-value">${b.type}</span></div>`;
            });
            html += '</div>';
        }
        
        // 宏
        if (macros.length > 0) {
            html += '<div class="env-group"><h4>宏</h4>';
            macros.forEach(b => {
                html += `<div class="env-item"><span class="env-key">${b.key}</span><span class="env-value">${b.type}</span></div>`;
            });
            html += '</div>';
        }
        
        // 用户定义变量
        if (variables.length > 0) {
            html += '<div class="env-group"><h4>变量</h4>';
            variables.forEach(b => {
                const value = typeof b.value === 'function' ? '#<function>' : 
                            Array.isArray(b.value) ? '#<list>' : 
                            this.formatResult(b.value);
                html += `<div class="env-item"><span class="env-key">${b.key}</span><span class="env-value">${value}</span></div>`;
            });
            html += '</div>';
        }
        
        this.envDisplay.innerHTML = html || '<div class="env-empty">环境为空</div>';
    }
}

// 导出 REPL
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { REPL };
}