
import BaseAction from '../BaseAction';
import { ActionName } from '../types';
import {  NTQQUserApi } from '@/core';

export default class GetRecentContact extends BaseAction<void, any> {
  actionName = ActionName.GetRecentContact;
  protected async _handle(payload: void) {
    return await NTQQUserApi.getRecentContactList()
  }
}
