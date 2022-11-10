import { el } from '../utils/dom';
import { IElement } from './interface';

export class ScriptPanelElement extends IElement {
	separator: HTMLDivElement = el('div', { className: 'separator' });
	// 创建提示板块
	notesContainer: HTMLDivElement = el('div', { className: 'notes card' });
	// 创建设置板块
	configsContainer: HTMLDivElement = el('div', { className: 'configs card' });
	configsBody: HTMLDivElement = el('div', { className: 'configs-body' });
	body: HTMLDivElement = el('div', { className: 'script-panel-body' });

	name?: string;

	connectedCallback() {
		this.replaceChildren();
		this.separator.innerText = this.name || '';
		this.append(this.separator);
		this.append(this.notesContainer);
		this.append(this.configsContainer);
		this.append(this.body);
	}
}
