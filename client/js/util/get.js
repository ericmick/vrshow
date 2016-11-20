export default function(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            resolve(xhr.responseText);
        };
        xhr.onerror = () => {
            reject(new Error('Problem with XMLHttpRequest request'));
        };
        xhr.open('GET', url);
    });
}