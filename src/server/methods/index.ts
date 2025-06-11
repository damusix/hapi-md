import { MethodConfig, ServerDependentFn } from '../helpers/index.ts';

import Github from './github.ts';

type Methods = MethodConfig | ServerDependentFn<MethodConfig[] | MethodConfig>;

const methods: Methods[] = [
    Github
];

export default methods;