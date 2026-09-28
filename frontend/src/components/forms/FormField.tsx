import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { Input, InputProps } from '../ui/Input';

export interface FormFieldProps extends Omit<InputProps, 'name'> {
  register?: UseFormRegisterReturn;
}

export const FormField: React.FC<FormFieldProps> = ({ register, ...props }) => {
  return <Input {...register} {...props} />;
};
