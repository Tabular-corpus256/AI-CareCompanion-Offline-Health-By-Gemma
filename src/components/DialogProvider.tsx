import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { AppDialog, type DialogButton } from './AppDialog';

interface DialogOptions {
  title: string;
  message?: string;
  icon?: string;
  iconColor?: string;
  buttons?: DialogButton[];
}

interface DialogContextValue {
  showDialog: (opts: DialogOptions) => void;
  hideDialog: () => void;
}

const DialogContext = createContext<DialogContextValue>({
  showDialog: () => {},
  hideDialog: () => {},
});

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogOptions & { visible: boolean }>({
    visible: false,
    title: '',
  });

  const showDialog = useCallback((opts: DialogOptions) => {
    setDialog({ ...opts, visible: true });
  }, []);

  const hideDialog = useCallback(() => {
    setDialog(s => ({ ...s, visible: false }));
  }, []);

  return (
    <DialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      <AppDialog
        visible={dialog.visible}
        onClose={hideDialog}
        title={dialog.title}
        message={dialog.message}
        icon={dialog.icon}
        iconColor={dialog.iconColor}
        buttons={dialog.buttons || [{ text: 'OK', onPress: hideDialog, variant: 'primary' }]}
      />
    </DialogContext.Provider>
  );
}

export function useAppDialog() {
  return useContext(DialogContext);
}
