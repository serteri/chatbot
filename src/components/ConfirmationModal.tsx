// src/components/ConfirmationModal.tsx (Daha iyi ve önerilen versiyon)

import React, { useEffect, useRef } from 'react';

type Props = {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isConfirming?: boolean;
};

export default function ConfirmationModal({
                                              isOpen,
                                              title,
                                              message,
                                              onConfirm,
                                              onCancel,
                                              confirmText = "Onayla",
                                              cancelText = "İptal",
                                              isConfirming = false,
                                          }: Props) {
    const dialogRef = useRef<HTMLDialogElement | null>(null);

    // isOpen state'i değiştiğinde dialog'u programatik olarak aç/kapat
    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.showModal();
        } else {
            dialogRef.current?.close();
        }
    }, [isOpen]);

    // ESC tuşuna basıldığında onCancel fonksiyonunu tetikle
    const handleCancel = (e: React.SyntheticEvent) => {
        e.preventDefault();
        onCancel();
    };

    return (
        // <dialog> elementi, modal'lar için semantik olarak en doğru elementtir.
        <dialog ref={dialogRef} className="modal" onCancel={handleCancel}>
            <div className="modal-box">
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="py-4">{message}</p>
                <div className="modal-action">
                    <button onClick={onCancel} className="btn" disabled={isConfirming}>
                        {cancelText}
                    </button>
                    <button onClick={onConfirm} className="btn btn-error" disabled={isConfirming}>
                        {isConfirming ? <span className="loading loading-spinner"/> : confirmText}
                    </button>
                </div>
            </div>
        </dialog>
    );
}