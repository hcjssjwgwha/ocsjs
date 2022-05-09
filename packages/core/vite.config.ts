import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import banner from 'vite-plugin-banner';
import { author, description, homepage, license, name, version } from '../../package.json';

const bannerContent = `
/*!
 * ${name} ${version} ( ${homepage} )
 * ${description}
 * 版权所有 ${author}
 * 开源协议 ${license}
 */
`;

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    /** 取消css代码分离 */
    cssCodeSplit: false,
    /** 输出路径 */
    outDir: './dist',
    /** 清空输出路径 */
    emptyOutDir: true,
    /** 压缩代码 */
    minify: true,
    /** 打包库， 全局名字为 OCS */
    lib: {
      entry: './index.ts',
      name: 'OCS',
      fileName: () => 'index.min.js',
      formats: ['umd']
    }
  },
  define: {
    'process.env._VERSION_': JSON.stringify(version)
  },

  plugins: [vue(), vueJsx(), visualizer(), banner(bannerContent)]
});
