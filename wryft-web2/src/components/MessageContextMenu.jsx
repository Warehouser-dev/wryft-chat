import { ArrowBendUpLeft, PencilSimple, Trash, Copy } from 'phosphor-react';
import { useEffect, useRef } from 'react';

function MessageContextMenu({ x, y, message, isOwn, onReply, onEdit, onDelete, onCopyText, onClose }) {
    const menuRef = useRef(null);

    // Adjust position so it doesn't go off screen
    const style = {
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 10000,
    };

    // Shift up if near bottom
    useEffect(() => {
        const el = menuRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.bottom > window.innerHeight - 8) {
            el.style.top = `${y - rect.height}px`;
        }
        if (rect.right > window.innerWidth - 8) {
            el.style.left = `${x - rect.width}px`;
        }
    }, [x, y]);

    const items = [
        {
            icon: <ArrowBendUpLeft size={16} weight="bold" />,
            label: 'Reply',
            onClick: () => onReply(message),
        },
        {
            icon: <Copy size={16} weight="bold" />,
            label: 'Copy Text',
            onClick: () => onCopyText(message),
        },
        ...(isOwn ? [
            {
                icon: <PencilSimple size={16} weight="bold" />,
                label: 'Edit Message',
                onClick: () => onEdit(message),
            },
            {
                icon: <Trash size={16} weight="bold" />,
                label: 'Delete Message',
                onClick: () => onDelete(message),
                danger: true,
            },
        ] : []),
    ];

    return (
        <div className="ctx-menu" style={style} ref={menuRef} onClick={e => e.stopPropagation()}>
            {items.map((item, i) => (
                <button
                    key={i}
                    className={`ctx-menu-item ${item.danger ? 'danger' : ''}`}
                    onClick={item.onClick}
                >
                    {item.icon}
                    {item.label}
                </button>
            ))}
        </div>
    );
}

export default MessageContextMenu;
