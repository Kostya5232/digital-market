import React from "react";
import "./Button.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

export const Button: React.FC<ButtonProps> = ({ variant = "primary", size = "md", className = "", children, ...props }) => {
    return (
        <button className={`ui-button ui-button--${variant} ui-button--${size} ${className}`} {...props}>
            {children}
        </button>
    );
};

export default Button;
