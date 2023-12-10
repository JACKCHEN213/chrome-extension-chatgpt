const BASE_URL = 'http://192.168.24.20:3001';
const LOGIN_URL = 'api/User/login';
const LOGIN_VERIFY_URL = 'api/User/verify';
const CHAT_LOG_URL = 'api/Message/add'
const OPENAI_CHAT_URL = 'v1/chat/completions';

const MODEL_LIST = [
    'gpt-4-1106-preview',
    'gpt-4-0613',
    'gpt-4-0314',
    'gpt-4',
    'gpt-3.5-turbo-16k-0613',
    'gpt-3.5-turbo-16k',
    'gpt-3.5-turbo-1106',
    'gpt-3.5-turbo-0613',
    'gpt-3.5-turbo',
];
const DEFAULT_MODEL = 'gpt-4';

const ACCOUNT_INFO_STRUCTURE = {
    openai_proxy: '',
    openai_api_key: '',
    openai_session_key: '',
    token: '',
};
