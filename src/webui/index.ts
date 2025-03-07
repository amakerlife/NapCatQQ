/**
 * @file WebUI服务入口文件
 */

import express from 'express';
import { LogWrapper } from '@/common/log';
import { NapCatPathWrapper } from '@/common/path';
import { WebUiConfigWrapper } from '@webapi/helper/config';
import { ALLRouter } from '@webapi/router';
import { cors } from '@webapi/middleware/cors';
import { createUrl } from '@webapi/utils/url';
import { sendSuccess } from '@webapi/utils/response';
import { join } from 'node:path';

// 实例化Express
const app = express();

/**
 * 初始化并启动WebUI服务。
 * 该函数配置了Express服务器以支持JSON解析和静态文件服务，并监听6099端口。
 * 无需参数。
 * @returns {Promise<void>} 无返回值。
 */
export let WebUiConfig: WebUiConfigWrapper;
export let webUiPathWrapper: NapCatPathWrapper;

export async function InitWebUi(logger: LogWrapper, pathWrapper: NapCatPathWrapper) {
    webUiPathWrapper = pathWrapper;
    WebUiConfig = new WebUiConfigWrapper();
    const config = await WebUiConfig.GetWebUIConfig();
    if (config.port == 0) {
        logger.log('[NapCat] [WebUi] Current WebUi is not run.');
        return;
    }

    // ------------注册中间件------------
    // 使用express的json中间件
    app.use(express.json());

    // CORS中间件
    // TODO:
    app.use(cors);
    // ------------中间件结束------------

    // ------------挂载路由------------
    // 挂载静态路由（前端），路径为 [/前缀]/webui
    app.use('/webui', express.static(pathWrapper.staticPath));
    // 挂载API接口
    app.use('/api', ALLRouter);
    // 所有剩下的请求都转到静态页面
    const indexFile = join(pathWrapper.staticPath, 'index.html');

    app.all(/\/webui\/(.*)/, (_req, res) => {
        res.sendFile(indexFile);
    });

    // 初始服务（先放个首页）
    app.all('/', (_req, res) => {
        sendSuccess(res, null, 'NapCat WebAPI is now running!');
    });
    // ------------路由挂载结束------------

    // ------------启动服务------------
    app.listen(config.port, config.host, async () => {
        // 启动后打印出相关地址
        const port = config.port.toString(),
            searchParams = { token: config.token };
        if (config.host !== '' && config.host !== '0.0.0.0') {
            logger.log(
                `[NapCat] [WebUi] WebUi User Panel Url: ${createUrl(config.host, port, '/webui', searchParams)}`
            );
        }
        logger.log(`[NapCat] [WebUi] WebUi Local Panel Url: ${createUrl('127.0.0.1', port, '/webui', searchParams)}`);
    });
    // ------------Over！------------
}
