import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FormStateContextType {
  hasOpenForms: boolean;
  registerForm: () => void;
  unregisterForm: () => void;
}

const FormStateContext = createContext<FormStateContextType | undefined>(undefined);

export const FormStateProvider = ({ children }: { children: ReactNode }) => {
  const [openFormsCount, setOpenFormsCount] = useState(0);

  const registerForm = () => {
    setOpenFormsCount(prev => prev + 1);
    console.log('📝 Formulaire ouvert (total:', openFormsCount + 1, ')');
  };

  const unregisterForm = () => {
    setOpenFormsCount(prev => Math.max(0, prev - 1));
    console.log('📝 Formulaire fermé (total:', Math.max(0, openFormsCount - 1), ')');
  };

  return (
    <FormStateContext.Provider value={{ 
      hasOpenForms: openFormsCount > 0,
      registerForm,
      unregisterForm
    }}>
      {children}
    </FormStateContext.Provider>
  );
};

export const useFormState = () => {
  const context = useContext(FormStateContext);
  if (!context) {
    throw new Error('useFormState must be used within FormStateProvider');
  }
  return context;
};
