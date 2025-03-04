import { ITerminalOptions, Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
const { clipboard } = require('electron');
const fitAddon = new FitAddon();

/**
 * xterm 终端
 *
 * @see https://github.com/xtermjs/xterm.js
 */
export class ITerminal extends Terminal {
	uid: string = '';
	constructor(uid: string, options?: ITerminalOptions) {
		super(
			Object.assign(
				{
					cursorBlink: true,
					convertEol: true,
					fontFamily: "Consolas, 'Courier New', monospace",
					fontSize: 12,
					theme: { background: '#32302F' },
					rows: 40
				},
				options
			)
		);
		this.uid = uid;
		/** 载入窗口尺寸自适应插件 */
		this.loadAddon(fitAddon);
		this.onKey((key) => {
			const char = key.domEvent.key;
			/** 复制内容 */
			if (key.domEvent.ctrlKey && char === 'c') {
				clipboard.writeText(this.getSelection());
			}
		});

		window.onresize = () => {
			this.fit();
		};
	}

	fit() {
		try {
			fitAddon.fit();
		} catch {}
		// const dimensions = fitAddon.proposeDimensions();
		// if (dimensions?.cols && dimensions?.rows) {
		//     this.resize?.(dimensions.cols, dimensions.rows);
		// }
	}

	write(data: string) {
		super.write(data);
		/** 内容写入时，定时自适应界面 */
		this.fit();
	}

	writeln(data: string | Uint8Array, callback?: () => void): void {
		super.writeln(data, callback);
		/** 内容写入时，定时自适应界面 */
		this.fit();
	}

	override clear(): void {
		super.clear();
		// this.write(`ocs@${this.uid}> `);
	}
}
