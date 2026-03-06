import { useEffect, useRef, useState } from 'react'
import { previewJobPostingApi } from '../data/apiClient'

const INITIAL_FORM = {
  url: '',
  title: '',
  body: '',
  postedAt: '',
  companyName: '',
}

function JobForm({ onSubmit, isLoading, initialValues = null, mode = 'create' }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [localError, setLocalError] = useState('')
  const [previewMessage, setPreviewMessage] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const lastPreviewUrl = useRef('')
  const autoPreviewed = useRef(false)
  const urlAutoTimer = useRef(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'title') {
        next.companyName = extractCompanyFromTitle(value) || ''
      }
      return next
    })
  }

  const normalizePostedAt = (value) => {
    if (!value) return ''
    const relativeMatch = value.match(
      /(\d+)\s+(day|week|month|hour|minute)s?\s+ago/i,
    )
    let date = null
    if (relativeMatch) {
      const amount = Number(relativeMatch[1])
      const unit = relativeMatch[2].toLowerCase()
      date = new Date()
      if (unit === 'day') date.setDate(date.getDate() - amount)
      if (unit === 'week') date.setDate(date.getDate() - amount * 7)
      if (unit === 'month') date.setMonth(date.getMonth() - amount)
      if (unit === 'hour') date.setHours(date.getHours() - amount)
      if (unit === 'minute') date.setMinutes(date.getMinutes() - amount)
    } else {
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) {
        date = parsed
      }
    }
    return date ? date.toISOString().slice(0, 10) : ''
  }

  useEffect(() => {
    if (!initialValues) {
      setForm(INITIAL_FORM)
      return
    }
    setForm({
      url: initialValues.url || '',
      title: initialValues.title || '',
      body: initialValues.body || '',
      postedAt: normalizePostedAt(initialValues.postedAt) || '',
      companyName:
        initialValues.companyName ||
        extractCompanyFromTitle(initialValues.title || '') ||
        '',
    })
    setPreviewMessage('')
    setLocalError('')
    lastPreviewUrl.current = ''
    autoPreviewed.current = false
  }, [initialValues])

  useEffect(() => {
    if (mode !== 'update') return
    if (!initialValues || !form.url.trim()) return
    if (autoPreviewed.current) return
    autoPreviewed.current = true
    handlePreview()
  }, [form.url, initialValues, mode])

  useEffect(() => {
    const url = form.url.trim()
    if (!url || url === lastPreviewUrl.current) {
      return
    }
    if (previewLoading) {
      return
    }
    if (urlAutoTimer.current) {
      clearTimeout(urlAutoTimer.current)
    }
    urlAutoTimer.current = setTimeout(() => {
      handlePreview()
    }, 600)
    return () => {
      if (urlAutoTimer.current) {
        clearTimeout(urlAutoTimer.current)
      }
    }
  }, [form.url, previewLoading])

  useEffect(() => {
    if (!form.title) return
    setForm((prev) => ({
      ...prev,
      companyName: extractCompanyFromTitle(prev.title) || prev.companyName,
    }))
  }, [form.title])

  const handlePreview = async () => {
    const url = form.url.trim()
    if (!url || url === lastPreviewUrl.current) {
      return
    }
    setPreviewLoading(true)
    setPreviewMessage('')
    try {
      const result = await previewJobPostingApi(url)
      if (result.fallback) {
        setPreviewMessage('자동 추출 실패: 수동 입력이 필요합니다.')
        return
      }
      setForm((prev) => ({
        ...prev,
        title: result.title || prev.title,
        body: result.body || prev.body,
        postedAt: normalizePostedAt(result.postedAt) || prev.postedAt,
        companyName:
          result.companyName ||
          extractCompanyFromTitle(result.title || prev.title) ||
          prev.companyName,
      }))
      lastPreviewUrl.current = url
      if (result.postedAt) {
        const normalized = normalizePostedAt(result.postedAt)
        setPreviewMessage(
          `자동 채움 완료 · 업로드일: ${
            normalized || result.postedAt
          } (확인 필요)`,
        )
      } else {
        setPreviewMessage('자동 채움이 완료되었습니다. 내용을 확인하세요.')
      }
    } catch (err) {
      setPreviewMessage('자동 추출에 실패했습니다. 수동 입력해주세요.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLocalError('')

    if (!form.url.trim() || !form.title.trim() || !form.body.trim()) {
      setLocalError('URL, 제목, 본문은 필수입니다.')
      return
    }

    try {
      await onSubmit({
        url: form.url.trim(),
        title: form.title.trim(),
        body: form.body.trim(),
        postedAt: form.postedAt ? form.postedAt : undefined,
        companyName: form.companyName || undefined,
      })
      if (mode === 'create') {
        setForm(INITIAL_FORM)
      }
    } catch (err) {
      return
    }
  }

  return (
    <form className="job-form" onSubmit={handleSubmit}>
      <label className="field">
        <div className="field-inline">
          <span>URL 링크</span>
          <button
            type="button"
            className="link-button link-plain"
            onClick={handlePreview}
            disabled={previewLoading || !form.url.trim()}
          >
            {previewLoading ? '불러오는 중...' : '자동 채움'}
          </button>
        </div>
        <input
          type="url"
          name="url"
          placeholder="https://company.com/jobs/..."
          value={form.url}
          onChange={handleChange}
          onBlur={handlePreview}
          required
        />
        {previewMessage && <p className="form-hint">{previewMessage}</p>}
      </label>

      <label className="field">
        <span>제목</span>
        <input
          type="text"
          name="title"
          placeholder="예: Data Engineer"
          value={form.title}
          onChange={handleChange}
          required
        />
      </label>

      <label className="field">
        <span>회사명</span>
        <input
          type="text"
          name="companyName"
          value={form.companyName}
          readOnly
        />
      </label>

      <label className="field">
        <span>공고 업로드일</span>
        <input
          type="date"
          name="postedAt"
          value={form.postedAt}
          onChange={handleChange}
        />
      </label>


      <label className="field">
        <span>본문</span>
        <textarea
          name="body"
          placeholder="채용공고 전문을 붙여넣어 주세요."
          rows={8}
          value={form.body}
          onChange={handleChange}
          required
        />
      </label>

      {localError && <p className="form-error">{localError}</p>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? '처리 중...' : mode === 'update' ? '업데이트' : '공고 제출'}
      </button>
    </form>
  )
}

export default JobForm

function extractCompanyFromTitle(title) {
  if (!title) return ''
  const separators = [' | ', ' - ', ' — ', ' – ']
  for (const sep of separators) {
    if (title.includes(sep)) {
      const parts = title.split(sep).map((part) => part.trim()).filter(Boolean)
      if (parts.length >= 2) {
        return parts[1]
      }
    }
  }
  return ''
}
