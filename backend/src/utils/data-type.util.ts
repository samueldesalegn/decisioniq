export function isNumeric(value: string | undefined): boolean {
    if (!value || value.trim() === '') {
        return false;
    }

    return !Number.isNaN(Number(value));
}

export function isDateLike(value: string | undefined): boolean {
    if (!value) {
        return false;
    }

    const trimmed = value.trim();
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!datePattern.test(trimmed)) {
        return false;
    }

    return !Number.isNaN(Date.parse(trimmed));
}
