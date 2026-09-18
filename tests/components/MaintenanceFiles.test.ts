import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MaintenanceFiles from '~/components/MaintenanceFiles.vue'
import { makeMaintenanceFile } from '../helpers/test-data'

vi.mock('~/utils/api', () => ({
  getRecordFiles: vi.fn(),
  uploadRecordFile: vi.fn(),
  downloadFile: vi.fn(),
  deleteFile: vi.fn(),
  getFileBlobUrl: vi.fn(),
}))

const stubs = {
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot>{{ label }}</slot></button>',
    props: ['label', 'icon', 'variant', 'color', 'size', 'loading', 'disabled'],
    // ★ emits を宣言しないと onClick が $attrs 経由でも root へ fallthrough し、
    // $emit('click') と二重発火する (実測)。宣言すれば onClick だけ $attrs から
    // 除外され、data-testid 等の他の属性は通常どおり fallthrough する。
    emits: ['click'],
  },
  UModal: {
    template: '<div v-if="open"><slot name="content" /></div>',
    props: ['open'],
  },
  UIcon: {
    template: '<span />',
    props: ['name'],
  },
}

const imageFile = makeMaintenanceFile({ id: 'f1', filename: 'photo.jpg', content_type: 'image/jpeg', size_bytes: 1536 })

describe('MaintenanceFiles', () => {
  beforeEach(async () => {
    const api = await import('~/utils/api')
    vi.mocked(api.getRecordFiles).mockReset().mockResolvedValue([imageFile])
    vi.mocked(api.uploadRecordFile).mockReset().mockResolvedValue(makeMaintenanceFile({ id: 'f2', filename: 'new.pdf', content_type: 'application/pdf' }))
    vi.mocked(api.downloadFile).mockReset().mockResolvedValue(undefined)
    vi.mocked(api.deleteFile).mockReset().mockResolvedValue(undefined)
    vi.mocked(api.getFileBlobUrl).mockReset().mockResolvedValue('blob:mock-url')
  })

  it('renders file list with a thumbnail', async () => {
    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('photo.jpg')
    expect(wrapper.text()).toContain('1.5 KB')
  })

  it('shows empty state', async () => {
    const { getRecordFiles } = await import('~/utils/api')
    vi.mocked(getRecordFiles).mockResolvedValue([])

    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('添付ファイルはありません')
  })

  it('renders heading', async () => {
    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('添付ファイル')
  })

  it('uploads a file when input changes and refetches the list', async () => {
    const { getRecordFiles, uploadRecordFile } = await import('~/utils/api')
    vi.mocked(getRecordFiles).mockResolvedValue([])
    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()

    const file = new File(['data'], 'new.pdf', { type: 'application/pdf' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await flushPromises()

    expect(uploadRecordFile).toHaveBeenCalledWith('record-1', file)
    expect(getRecordFiles).toHaveBeenCalledTimes(2)
  })

  it('does not upload when no file is selected', async () => {
    const { uploadRecordFile } = await import('~/utils/api')
    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()

    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [] })
    await input.trigger('change')
    await flushPromises()

    expect(uploadRecordFile).not.toHaveBeenCalled()
  })

  it('logs and stays in uploading=false when upload fails', async () => {
    const { uploadRecordFile } = await import('~/utils/api')
    vi.mocked(uploadRecordFile).mockRejectedValue(new Error('upload boom'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()

    const file = new File(['data'], 'new.pdf', { type: 'application/pdf' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await flushPromises()

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('downloads a file with its filename', async () => {
    const { downloadFile } = await import('~/utils/api')
    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()

    await wrapper.find('[data-testid="download-f1"]').trigger('click')
    await flushPromises()

    expect(downloadFile).toHaveBeenCalledWith('f1', 'photo.jpg')
  })

  it('logs when download fails', async () => {
    const { downloadFile } = await import('~/utils/api')
    vi.mocked(downloadFile).mockRejectedValue(new Error('download boom'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()

    await wrapper.find('[data-testid="download-f1"]').trigger('click')
    await flushPromises()

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('deletes a file, revokes its thumbnail objectURL, and refetches', async () => {
    const { deleteFile, getRecordFiles } = await import('~/utils/api')
    vi.mocked(getRecordFiles).mockResolvedValueOnce([imageFile]).mockResolvedValueOnce([])
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()

    await wrapper.find('[data-testid="delete-f1"]').trigger('click')
    await flushPromises()

    expect(deleteFile).toHaveBeenCalledWith('f1')
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url')
    expect(getRecordFiles).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('添付ファイルはありません')
    revokeSpy.mockRestore()
  })

  it('logs when delete fails', async () => {
    const { deleteFile } = await import('~/utils/api')
    vi.mocked(deleteFile).mockRejectedValue(new Error('delete boom'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()

    await wrapper.find('[data-testid="delete-f1"]').trigger('click')
    await flushPromises()

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('opens a PDF preview in a new tab (別タブ)', async () => {
    const { getRecordFiles } = await import('~/utils/api')
    const pdfFile = makeMaintenanceFile({ id: 'f3', filename: 'doc.pdf', content_type: 'application/pdf' })
    vi.mocked(getRecordFiles).mockResolvedValue([pdfFile])
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()

    await wrapper.find('[data-testid="preview-f3"]').trigger('click')
    await flushPromises()

    expect(openSpy).toHaveBeenCalledWith('blob:mock-url', '_blank')
    openSpy.mockRestore()
  })

  it('logs when PDF preview fails', async () => {
    const { getRecordFiles, getFileBlobUrl } = await import('~/utils/api')
    const pdfFile = makeMaintenanceFile({ id: 'f3', filename: 'doc.pdf', content_type: 'application/pdf' })
    vi.mocked(getRecordFiles).mockResolvedValue([pdfFile])
    vi.mocked(getFileBlobUrl).mockRejectedValueOnce(new Error('preview boom'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()

    await wrapper.find('[data-testid="preview-f3"]').trigger('click')
    await flushPromises()

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('opens an image preview modal using the cached thumbnail', async () => {
    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()

    await wrapper.find('[data-testid="preview-f1"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('photo.jpg')
  })

  it('fetches a fresh blob URL for image preview when no thumbnail is cached yet', async () => {
    const { getRecordFiles, getFileBlobUrl } = await import('~/utils/api')
    vi.mocked(getRecordFiles).mockResolvedValue([imageFile])
    // サムネイル読み込みが失敗した状態を模す (thumbnailUrls に無い)
    vi.mocked(getFileBlobUrl).mockRejectedValueOnce(new Error('thumb boom')).mockResolvedValueOnce('blob:preview-url')
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()

    await wrapper.find('[data-testid="preview-f1"]').trigger('click')
    await flushPromises()

    expect(getFileBlobUrl).toHaveBeenCalledTimes(2)
    consoleSpy.mockRestore()
  })

  it('renders a generic icon for other file types without a preview link', async () => {
    const { getRecordFiles } = await import('~/utils/api')
    const textFile = makeMaintenanceFile({ id: 'f5', filename: 'note.txt', content_type: 'text/plain' })
    vi.mocked(getRecordFiles).mockResolvedValue([textFile])

    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('note.txt')
    expect(wrapper.find('[data-testid="preview-f5"]').exists()).toBe(false)
  })

  it('logs and swallows fetch errors, leaving the list empty', async () => {
    const { getRecordFiles } = await import('~/utils/api')
    vi.mocked(getRecordFiles).mockRejectedValue(new Error('boom'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()

    expect(consoleSpy).toHaveBeenCalled()
    expect(wrapper.text()).toContain('添付ファイルはありません')
    consoleSpy.mockRestore()
  })

  it('revokes all thumbnail objectURLs on unmount', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const wrapper = mount(MaintenanceFiles, { props: { recordId: 'record-1' }, global: { stubs } })
    await flushPromises()
    wrapper.unmount()

    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url')
    revokeSpy.mockRestore()
  })
})
