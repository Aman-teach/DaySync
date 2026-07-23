import { Client, Databases, Account, Storage, Functions } from 'react-native-appwrite';
import { APPWRITE_CONFIG } from '@/constants/appwriteConfig';

export const client = new Client();

client
  .setEndpoint(APPWRITE_CONFIG.ENDPOINT)
  .setProject(APPWRITE_CONFIG.PROJECT_ID);

export const databases = new Databases(client);
export const account = new Account(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export { APPWRITE_CONFIG };
export { Query, ID, Permission, Role, ExecutionMethod } from 'react-native-appwrite';
