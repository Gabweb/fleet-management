import useRegistry from './useRegistry';

export default function useUiRegistry<T>(key: string) {
    return useRegistry<Record<string, T>>('ui', key);
}
