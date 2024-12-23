import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import BaseAction from '../BaseAction';
import { ActionName } from '../types';
import { AdapterConfigWrap } from '@/onebot/config/config';

const SchemaData = {
    type: 'object',
    properties: {
        count: { type: ['number', 'string'] },
    },
} as const satisfies JSONSchema;

type Payload = FromSchema<typeof SchemaData>;

export default class GetRecentContact extends BaseAction<Payload, any> {
    actionName = ActionName.GetRecentContact;
    payloadSchema = SchemaData;

    async _handle(payload: Payload, adapter: string) {
        const ret = await this.core.apis.UserApi.getRecentContactListSnapShot(+(payload.count || 10));
        const network = Object.values(this.obContext.configLoader.configData.network) as Array<AdapterConfigWrap>;
        //烘焙消息
        const msgFormat = network.flat().find(e => e.name === adapter)?.messagePostFormat ?? 'array';
        return await Promise.all(ret.info.changedList.map(async (t) => {
            const FastMsg = await this.core.apis.MsgApi.getMsgsByMsgId({ chatType: t.chatType, peerUid: t.peerUid }, [t.msgId]);
            if (FastMsg.msgList.length > 0) {
                //扩展ret.info.changedList
                const lastestMsg = await this.obContext.apis.MsgApi.parseMessage(FastMsg.msgList[0], msgFormat);
                return {
                    lastestMsg: lastestMsg,
                    peerUin: t.peerUin,
                    remark: t.remark,
                    msgTime: t.msgTime,
                    chatType: t.chatType,
                    msgId: t.msgId,
                    sendNickName: t.sendNickName,
                    sendMemberName: t.sendMemberName,
                    peerName: t.peerName,
                };
            }
            return {
                peerUin: t.peerUin,
                remark: t.remark,
                msgTime: t.msgTime,
                chatType: t.chatType,
                msgId: t.msgId,
                sendNickName: t.sendNickName,
                sendMemberName: t.sendMemberName,
                peerName: t.peerName,
            };
        }));
    }
}
