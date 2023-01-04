import { $message } from '../../projects/render';
import { $ } from '../../utils/common';
import { domSearchAll } from '../utils/dom';
import {
	RawElements,
	ResolverResult,
	SearchedElements,
	WorkContext,
	WorkOptions,
	WorkResult,
	WorkUploadType
} from './interface';
import { defaultQuestionResolve } from './question.resolver';
import { defaultWorkTypeResolver } from './utils';
import EventEmitter from 'events';

type WorkerEvent<E extends RawElements = RawElements> = {
	/** 答题开始 */
	start: () => void;
	/** 答题结果 */
	done: () => void;
	/** 关闭答题 */
	close: () => void;
	/** 暂停答题 */
	stop: () => void;
	/** 继续答题 */
	continuate: () => void;

	/** 元素被查询 */
	'element-searched': (elements: SearchedElements<E, HTMLElement[]>) => void;

	error: (e: Error, ctx?: WorkContext<E>) => void;
};

/**
 * 自动答题器， 传入一些指定的配置， 就可以进行自动答题。
 *
 * @param work      工作器, 传入一个方法可自定义工作器，或者使用默认的工作器，详情： {@link WorkOptions.work}
 * @param answerer  查题器, : 默认是 {@link defaultAnswerWrapperHandler}
 *
 */
export class OCSWorker<E extends RawElements = RawElements> extends EventEmitter {
	opts: WorkOptions<E>;
	isRunning = false;
	isClose = false;
	isStop = false;

	constructor(opts: WorkOptions<E>) {
		super();
		this.opts = opts;
	}

	override on<K extends keyof WorkerEvent<E>>(eventName: K, listener: WorkerEvent<E>[K]): this {
		return super.on(eventName.toString(), listener);
	}

	override once<K extends keyof WorkerEvent<E>>(eventName: K, listener: WorkerEvent<E>[K]): this {
		return super.once(eventName.toString(), listener);
	}

	override emit<K extends keyof WorkerEvent<E>>(eventName: K, ...args: Parameters<WorkerEvent<E>[K]>): boolean {
		return super.emit(eventName.toString(), ...args);
	}

	override off<K extends keyof WorkerEvent<E>>(eventName: K, listener: WorkerEvent<E>[K]): this {
		return super.off(eventName.toString(), listener);
	}

	currentContext?: WorkContext<E>;

	/** 启动答题器  */
	async doWork() {
		this.once('close', () => {
			this.isClose = true;
		});

		this.on('stop', () => {
			this.isStop = true;
		});

		this.on('continuate', () => {
			this.isStop = false;
		});

		this.emit('start');
		this.isRunning = true;
		const results: WorkResult<E>[] = [];
		let result: ResolverResult;
		let type;
		let error: Error | undefined;

		/** 寻找父节点 */
		const root: HTMLElement[] | null =
			typeof this.opts.root === 'string' ? Array.from(document.querySelectorAll(this.opts.root)) : this.opts.root;

		/** 遍历并执行 */
		for (const el of root) {
			/** 强行关闭 */
			if (this.isClose === true) {
				this.isRunning = false;
				this.emit('close');
				this.emit('done');
				return results;
			}

			const time = Date.now();
			result = { finish: false };
			error = undefined;
			type = undefined;

			try {
				/**  dom 搜索 */
				const elements: WorkContext<E>['elements'] = domSearchAll<E>(this.opts.elements, el);

				/** 执行元素搜索钩子 */
				this.emit('element-searched', elements);

				/** 改变上下文 */
				this.currentContext = { searchResults: [], root: el, elements };

				/** 获取题目类型 */
				if (typeof this.opts.work === 'object') {
					type =
						this.opts.work.type === undefined
							? // 使用默认解析器
							  defaultWorkTypeResolver(this.currentContext)
							: // 自定义解析器
							typeof this.opts.work.type === 'string'
							? this.opts.work.type
							: this.opts.work.type(this.currentContext);
				}

				/** 检查是否暂停中 */
				if (this.isStop) {
					const stop = $message('warn', { duration: 0, content: '暂停中...' });
					await new Promise<void>((resolve, reject) => {
						const interval = setInterval(() => {
							if (this.isStop === false) {
								clearInterval(interval);
								stop.remove();
								resolve();
							}
						}, 200);
					});
				}

				/** 查找题目 */
				const searchResults = await this.doAnswer(elements, type, this.currentContext);

				if (!searchResults) {
					throw new Error('答案获取失败, 请重新运行, 或者忽略此题。');
				} else {
					/** 筛选出有效的答案 */
					const validResults = searchResults
						.map((res) => res.answers.map((ans) => ans.answer))
						.flat()
						.filter((ans) => ans);

					// 答案为 undefined 的情况， 需要赋值给一个空字符串
					searchResults.forEach((res) => {
						res.answers = res.answers.map((ans) => {
							ans.answer = ans.answer ? ans.answer : '';
							return ans;
						});
					});

					/** 改变上下文 */
					this.currentContext = { searchResults, root: el, elements };

					if (searchResults.length === 0 || validResults.length === 0) {
						throw new Error('搜索不到答案, 请重新运行, 或者忽略此题。');
					}
				}

				/** 开始处理 */
				if (typeof this.opts.work === 'object') {
					if (elements.options) {
						/** 使用默认处理器 */

						if (type) {
							const resolver = defaultQuestionResolve(this.currentContext)[type];
							result = await resolver(searchResults, elements.options, this.opts.work.handler);
						} else {
							throw new Error('题目类型解析失败, 请自行提供解析器, 或者忽略此题。');
						}
					} else {
						throw new Error('elements.options 为空 ! 使用默认处理器, 必须提供题目选项的选择器。');
					}
				} else {
					/** 使用自定义处理器 */
					result = this.opts.work(this.currentContext);
				}
			} catch (e) {
				error = e as any;
				console.error(e);
				this.emit('error', e as any, this.currentContext);

				if (this.opts.stopWhenError) {
					this.isRunning = false;
					this.emit('done');
					return results;
				}
			}

			const res = {
				time,
				ctx: this.currentContext,
				result,
				consume: Date.now() - time,
				error,
				type
			};

			results.push(res);

			/** 监听答题结果 */
			await this.opts.onResult?.(res);

			/** 间隔 */
			const { period = 3 * 1000 } = this.opts;
			await $.sleep(period);
		}

		this.isRunning = false;
		this.emit('done');
		return results;
	}

	/** 获取答案 */
	private async doAnswer(elements: WorkContext<E>['elements'], type: string | undefined, ctx: WorkContext<E>) {
		let { timeout = 60 * 1000, retry = 2 } = this.opts;
		/** 解析选项，可以自定义查题器 */

		const answer = async () => {
			return await Promise.race([
				this.opts.answerer(elements, type, ctx),
				/** 最长请求时间 */
				$.sleep(timeout)
			]);
		};

		let answers = await answer();
		if (!answers) {
			/** 重试获取答案 */
			while (retry && !answers) {
				answers = await answer();
				retry--;
			}
		}

		return answers;
	}

	/** 答题结果处理器 */
	async uploadHandler(options: {
		// doWork 的返回值结果
		results: WorkResult<E>[];
		// 提交类型
		type: WorkUploadType;
		/**
		 * 是否上传处理器
		 *
		 * @param  uploadable  是否可以上传
		 * @param finishedRate 完成率
		 */
		callback: (finishedRate: number, uploadable: boolean) => void | Promise<void>;
	}) {
		const { results, type, callback } = options;
		let finished = 0;
		for (const result of results) {
			if (result.result?.finish) {
				finished++;
			}
		}
		const rate = results.length === 0 ? 0 : (finished / results.length) * 100;
		if (type !== 'nomove') {
			if (type === 'force') {
				await callback(rate, true);
			} else {
				await callback(rate, type === 'save' ? false : rate >= parseFloat(type.toString()));
			}
		}
	}
}
