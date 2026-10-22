'use client';

import React from 'react';
import { UIIcon } from '@gluestack-ui/core/icon/creator';
import {
  tva,
  withStyleContext,
} from '@gluestack-ui/utils/nativewind-utils';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { createSelect } from '@gluestack-ui/core/select/creator';
import { styled } from 'nativewind';
import {
  Actionsheet,
  ActionsheetContent,
  ActionsheetItem,
  ActionsheetItemText,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetBackdrop,
  ActionsheetScrollView,
  ActionsheetVirtualizedList,
  ActionsheetFlatList,
  ActionsheetSectionList,
  ActionsheetSectionHeaderText,
} from './select-actionsheet';
import { Pressable, View, TextInput } from 'react-native';

const SelectTriggerWrapper = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  React.ComponentProps<typeof Pressable>
>(function SelectTriggerWrapper({ ...props }, ref) {
  return <Pressable {...props} ref={ref} />;
});

const selectIconStyle = tva({
  base: 'text-on-surface-variant fill-none h-5 w-5',
});

const selectStyle = tva({
  base: '',
});

const selectTriggerStyle = tva({
  base: 'min-h-12 w-full flex-row items-center rounded-field border border-outline bg-surface px-3.5 gap-2 overflow-hidden data-[focus=true]:border-2 data-[focus=true]:border-primary data-[focus=true]:px-[13px] data-[invalid=true]:border-2 data-[invalid=true]:border-danger data-[invalid=true]:px-[13px] data-[disabled=true]:border-outline-variant data-[disabled=true]:bg-disabled',
});

const selectInputStyle = tva({
  base: 'flex-1 h-full py-0 px-0 text-field font-manrope-medium text-on-surface placeholder:text-on-surface-variant data-[disabled=true]:text-on-disabled pointer-events-none',
});

const StyledIcon = styled(UIIcon, {
  className: {
    target: 'style',
  },
});

const UISelect = createSelect(
  {
    Root: View,
    Trigger: withStyleContext(SelectTriggerWrapper),
    Input: TextInput,
    Icon: StyledIcon,
  },
  {
    Portal: Actionsheet,
    Backdrop: ActionsheetBackdrop,
    Content: ActionsheetContent,
    DragIndicator: ActionsheetDragIndicator,
    DragIndicatorWrapper: ActionsheetDragIndicatorWrapper,
    Item: ActionsheetItem,
    ItemText: ActionsheetItemText,
    ScrollView: ActionsheetScrollView,
    VirtualizedList: ActionsheetVirtualizedList,
    FlatList: ActionsheetFlatList,
    SectionList: ActionsheetSectionList,
    SectionHeaderText: ActionsheetSectionHeaderText,
  }
);

type ISelectProps = VariantProps<typeof selectStyle> &
  React.ComponentProps<typeof UISelect> & { className?: string };

const Select = React.forwardRef<
  React.ComponentRef<typeof UISelect>,
  ISelectProps
>(function Select({ className, ...props }, ref) {
  return (
    <UISelect
      className={selectStyle({
        class: className,
      })}
      ref={ref}
      {...props}
    />
  );
});

type ISelectTriggerProps = React.ComponentProps<typeof UISelect.Trigger> & {
  className?: string;
};

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof UISelect.Trigger>,
  ISelectTriggerProps
>(function SelectTrigger({ className, ...props }, ref) {
  return (
    <UISelect.Trigger
      className={selectTriggerStyle({ class: className })}
      ref={ref}
      context={{}}
      {...props}
    />
  );
});

type ISelectInputProps = React.ComponentProps<typeof UISelect.Input> & {
  className?: string;
};

const SelectInput = React.forwardRef<
  React.ComponentRef<typeof UISelect.Input>,
  ISelectInputProps
>(function SelectInput({ className, ...props }, ref) {
  return (
    <UISelect.Input
      className={selectInputStyle({ class: className })}
      ref={ref}
      {...props}
    />
  );
});

type ISelectIcon = React.ComponentProps<typeof UISelect.Icon> & {
  className?: string;
};

const SelectIcon = React.forwardRef<
  React.ComponentRef<typeof UISelect.Icon>,
  ISelectIcon
>(function SelectIcon({ className, ...props }, ref) {
  return (
    <UISelect.Icon
      className={selectIconStyle({ class: className })}
      ref={ref}
      {...props}
    />
  );
});

Select.displayName = 'Select';
SelectTrigger.displayName = 'SelectTrigger';
SelectInput.displayName = 'SelectInput';
SelectIcon.displayName = 'SelectIcon';

// Actionsheet Components
const SelectPortal = UISelect.Portal;
const SelectBackdrop = UISelect.Backdrop;
const SelectContent = UISelect.Content;
const SelectDragIndicator = UISelect.DragIndicator;
const SelectDragIndicatorWrapper = UISelect.DragIndicatorWrapper;
const SelectItem = UISelect.Item;
const SelectScrollView = UISelect.ScrollView;
const SelectVirtualizedList = UISelect.VirtualizedList;
const SelectFlatList = UISelect.FlatList;
const SelectSectionList = UISelect.SectionList;
const SelectSectionHeaderText = UISelect.SectionHeaderText;

export {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectItem,
  SelectScrollView,
  SelectVirtualizedList,
  SelectFlatList,
  SelectSectionList,
  SelectSectionHeaderText,
};
