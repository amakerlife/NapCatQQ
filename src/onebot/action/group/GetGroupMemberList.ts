import { OB11GroupMember } from '@/onebot';
import { OB11Entities } from '@/onebot/entities';
import BaseAction from '../BaseAction';
import { ActionName } from '../types';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { calcQQLevel } from '@/common/helper';

const SchemaData = {
    type: 'object',
    properties: {
        group_id: { type: ['number', 'string'] },
        no_cache: { type: ['boolean', 'string'] },
    },
    required: ['group_id'],
} as const satisfies JSONSchema;

type Payload = FromSchema<typeof SchemaData>;

class GetGroupMemberList extends BaseAction<Payload, OB11GroupMember[]> {
    actionName = ActionName.GetGroupMemberList;
    payloadSchema = SchemaData;

    async _handle(payload: Payload) {
        const groupMembers = await this.core.apis.GroupApi.getGroupMembersV2(payload.group_id.toString());
        const groupMembersArr = Array.from(groupMembers.values());
        let uids = groupMembersArr.map(item => item.uid);
        let CoreAndBase = await this.core.apis.GroupApi.getCoreAndBaseInfo(uids)
        let _groupMembers = groupMembersArr.map(item => {
            return OB11Entities.groupMember(payload.group_id.toString(), item);
        });

        const MemberMap: Map<number, OB11GroupMember> = new Map<number, OB11GroupMember>();
        const date = Math.round(Date.now() / 1000);

        for (let i = 0, len = _groupMembers.length; i < len; i++) {
            // 保证基础数据有这个 同时避免群管插件过于依赖这个杀了
            const Member = await this.core.apis.GroupApi.getGroupMember(payload.group_id.toString(), _groupMembers[i].user_id);
            _groupMembers[i].join_time = +(Member?.joinTime ?? date);
            _groupMembers[i].last_sent_time = +(Member?.lastSpeakTime ?? date);
            _groupMembers[i].qq_level = calcQQLevel(Member?.qqLevel);
            _groupMembers[i].sex = OB11Entities.sex(CoreAndBase.get(_groupMembers[i].user_id.toString())?.baseInfo.sex);
            _groupMembers[i].age = CoreAndBase.get(_groupMembers[i].user_id.toString())?.baseInfo.age ?? 0;
            MemberMap.set(_groupMembers[i].user_id, _groupMembers[i]);
        }


        const selfRole = groupMembers.get(this.core.selfInfo.uid)?.role;
        const isPrivilege = selfRole === 3 || selfRole === 4;


        if (isPrivilege) {
            try {
                const webGroupMembers = await this.core.apis.WebApi.getGroupMembers(payload.group_id.toString());
                for (let i = 0, len = webGroupMembers.length; i < len; i++) {
                    if (!webGroupMembers[i]?.uin) {
                        continue;
                    }
                    const MemberData = MemberMap.get(webGroupMembers[i]?.uin);
                    if (MemberData) {
                        MemberData.join_time = webGroupMembers[i]?.join_time;
                        MemberData.last_sent_time = webGroupMembers[i]?.last_speak_time;
                        MemberData.qage = webGroupMembers[i]?.qage;
                        MemberData.level = webGroupMembers[i]?.lv.level.toString();
                        MemberMap.set(webGroupMembers[i]?.uin, MemberData);
                    }
                }
            } catch (e) {
                const logger = this.core.context.logger;
                logger.logError.bind(logger)('GetGroupMemberList', e);
            }

        }

        _groupMembers = Array.from(MemberMap.values());
        return _groupMembers;
    }
}

export default GetGroupMemberList;
