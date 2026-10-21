<script lang="ts" setup>
import { reactive, ref, watch } from 'vue';
import { nanoid } from 'nanoid';
import { Pattern, TxtParserType, type TxtParseRule } from '../../core/book/txt-parser';
import type { TxtParseRuleEntity } from '../../core/database/database';
import { useTxtParseRuleStore } from '../../store/txt-parse-rules';
import { useMessage } from '../../hooks/message';
import { cloneByJSON } from '../../core/utils';
import Dialog from '../dialog/index.vue';
import RcSelect from '../select/index.vue';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  /** 传入则为编辑，否则为新增 */
  rule?: TxtParseRule | null;
}>(), {
  rule: null
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved', rule: TxtParseRuleEntity): void;
}>();

const message = useMessage();
const txtParseRuleStore = useTxtParseRuleStore();

const isEdit = ref(false);

const typeOptions: { label: string; value: TxtParserType }[] = [
  { label: '书名', value: TxtParserType.BOOK_NAME },
  { label: '作者', value: TxtParserType.AUTHOR },
  { label: '简介', value: TxtParserType.INTRO },
  { label: '章节列表', value: TxtParserType.CHAPTER_LIST }
];

const flagOptions: { label: string; value: Pattern }[] = [
  { label: '忽略大小写 i', value: Pattern.IGNORE_CASE },
  { label: '多行模式 m', value: Pattern.MULTI_LINE },
  { label: '全局匹配 g', value: Pattern.GLOBAL }
];

const form = reactive<TxtParseRuleEntity>({
  id: '',
  name: '',
  value: '',
  example: '',
  type: TxtParserType.CHAPTER_LIST,
  flags: [Pattern.IGNORE_CASE, Pattern.MULTI_LINE, Pattern.GLOBAL]
});

const initForm = () => {
  const rule = props.rule;
  isEdit.value = !!rule;
  form.id = rule?.id || '';
  form.name = rule?.name || '';
  form.value = rule?.value || '';
  form.example = rule?.example || '';
  form.type = rule?.type ?? TxtParserType.CHAPTER_LIST;
  form.flags = rule?.flags ? [...rule.flags] : [Pattern.IGNORE_CASE, Pattern.MULTI_LINE, Pattern.GLOBAL];
};

watch(() => props.modelValue, v => {
  if (v) initForm();
});

const toggleFlag = (flag: Pattern) => {
  const i = form.flags.indexOf(flag);
  if (i >= 0) form.flags.splice(i, 1);
  else form.flags.push(flag);
};

const save = async () => {
  try {
    if (!form.name.trim()) throw new Error('请输入规则名称');
    if (!form.value.trim()) throw new Error('请输入正则表达式');
    if (!form.example.trim()) throw new Error('请输入示例');
    new RegExp(form.value);
    const entity: TxtParseRuleEntity = cloneByJSON(form);
    entity.name = entity.name.trim();
    entity.value = entity.value.trim();
    entity.example = entity.example.trim();
    if (!isEdit.value) entity.id = `custom-${nanoid(10)}`;
    await txtParseRuleStore.put(entity);
    emit('saved', entity);
    emit('update:modelValue', false);
    message.success(isEdit.value ? '规则已更新' : '规则已添加');
  } catch (e: any) {
    message.error(e?.message || String(e));
  }
};
</script>

<template>
  <Dialog :model-value="modelValue" :title="isEdit ? '编辑解析规则' : '新增解析规则'" width="520px" confirm-text="保存" @update:model-value="emit('update:modelValue', $event)" @confirm="save">
    <div class="rule-form">
      <div class="rule-form-row">
        <span class="rc-label">名称</span>
        <input v-model="form.name" class="rc-input" placeholder="如：内置章节" />
      </div>
      <div class="rule-form-row">
        <span class="rc-label">类型</span>
        <RcSelect v-model="form.type" :options="typeOptions" />
      </div>
      <div class="rule-form-row">
        <span class="rc-label">正则</span>
        <input v-model="form.value" class="rc-input" placeholder="请输入正则表达式" />
      </div>
      <div class="rule-form-row">
        <span class="rc-label">示例</span>
        <input v-model="form.example" class="rc-input" placeholder="如：第一章 标题" />
      </div>
      <div class="rule-form-row flags">
        <span class="rc-label">标记</span>
        <div class="rule-form-flags">
          <label v-for="f in flagOptions" :key="f.value" class="rule-form-check">
            <input type="checkbox" :checked="form.flags.includes(f.value)" @change="toggleFlag(f.value)" />
            <span>{{ f.label }}</span>
          </label>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<style scoped lang="scss">
.rule-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-form-row {
  display: flex;
  align-items: center;
  gap: 12px;

  .rc-label {
    width: 42px;
  }

  .rc-input {
    flex: 1;
    min-width: 0;
  }

  &.flags {
    align-items: flex-start;
  }
}

.rule-form-flags {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-form-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;

  input {
    accent-color: var(--rc-primary);
    cursor: pointer;
  }
}
</style>
