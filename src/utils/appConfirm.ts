import {confirmAlert} from "react-confirm-alert";

type ConfirmDestructiveArgs = {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Primary action (e.g. delete). Dialog stays open until user dismisses. */
    onConfirm: () => void | Promise<void>;
};

/**
 * Standard app confirmation using react-confirm-alert.
 * Styling is global (see confirm-alert-overrides.css).
 */
type ConfirmProceedArgs = {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void | Promise<void>;
};

/** Two-step confirms where proceeding is not framed as delete (e.g. open dangerous edit). */
export function confirmProceed({
    title,
    message,
    confirmLabel = "Yes",
    cancelLabel = "No",
    onConfirm,
}: ConfirmProceedArgs): void {
    confirmAlert({
        title,
        message,
        buttons: [
            {
                label: cancelLabel,
                className: "rca-btn-cancel",
                onClick: () => undefined,
            },
            {
                label: confirmLabel,
                className: "rca-btn-confirm-primary",
                onClick: () => {
                    void onConfirm();
                },
            },
        ],
    });
}

export function confirmDestructive({
    title,
    message,
    confirmLabel = "Yes",
    cancelLabel = "Cancel",
    onConfirm,
}: ConfirmDestructiveArgs): void {
    confirmAlert({
        title,
        message,
        buttons: [
            {
                label: cancelLabel,
                className: "rca-btn-cancel",
                onClick: () => undefined,
            },
            {
                label: confirmLabel,
                className: "rca-btn-confirm-destructive",
                onClick: () => {
                    void onConfirm();
                },
            },
        ],
    });
}

export {confirmAlert} from "react-confirm-alert";
