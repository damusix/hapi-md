import { MethodConfig, ServerDependentFn } from '../helpers';

import Github from './github';

type Methods = MethodConfig | ServerDependentFn<MethodConfig[] | MethodConfig>;

const methods: Methods[] = [
    Github
];

export default methods;