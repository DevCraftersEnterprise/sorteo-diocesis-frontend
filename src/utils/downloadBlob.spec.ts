import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from './downloadBlob';

describe('downloadBlob', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('crea un <a download> temporal, lo clickea y limpia la URL del blob', () => {
    const blob = new Blob(['zip-bytes']);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const createElementSpy = vi.spyOn(document, 'createElement');

    downloadBlob(blob, 'sorteo_export.zip');

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(createElementSpy).toHaveBeenCalledWith('a');

    const link = appendSpy.mock.calls[0]![0] as HTMLAnchorElement;
    expect(link.href).toBe('blob:mock-url');
    expect(link.download).toBe('sorteo_export.zip');

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith(link);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
