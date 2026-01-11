export function str2hex(s: string): string {
    return [...new TextEncoder().encode(s)].map(b => b.toString(16).padStart(2,'0')).join('')
}

export function hex2str(s: string): string {
    const chunked: string[] = s.match(/.{1,2}/g)!;
    return new TextDecoder().decode(
        new Uint8Array(chunked.map(hexpair => parseInt(hexpair, 16)))
    )
}

