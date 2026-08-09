const formatDate = value => {
    if (!value) return null;
    const [year, month, day] = String(value).slice(0, 10).split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
};

const formatTime = value => value ? String(value).slice(0, 5) : null;

module.exports = { formatDate, formatTime };
