import { useEffect, useMemo, useState } from 'react'
import JobForm from './components/JobForm'
import SummaryList from './components/SummaryList'
import {
  fetchJobPostingsApi,
  submitJobPostingApi,
  triggerAtsApi,
  updateJobPostingApi,
  closeJobPostingApi,
} from './data/apiClient'
import './styles/app.css'

const VIEWS = {
  list: 'list',
  form: 'form',
}

function App() {
  const [view, setView] = useState(VIEWS.list)
  const [submissions, setSubmissions] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('recent')
  const [hideClosed, setHideClosed] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  const handleSubmit = async (formData) => {
    setError('')
    setStatusMessage('')
    setIsLoading(true)
    try {
      const result = await submitJobPostingApi(formData)

      if (result.status === 'duplicate') {
        setStatusMessage('이미 등록된 공고입니다. 리스트에서 확인하세요.')
        setActiveId(result.existingId || null)
      } else {
        setStatusMessage('분석 대기 중입니다. 완료 후 새로고침 해주세요.')
        const now = new Date().toISOString()
        const optimistic = {
          id: result.jobId,
          companyName: formData.companyName || result.companyName || '미정',
          title: formData.title,
          postedAt: formData.postedAt || result.postedAt || null,
          url: formData.url,
          notionUrl: '',
          createdAt: now,
          contentUpdatedAt: now,
          salaryRange: null,
          workType: null,
          hybridDaysOnsite: null,
          position: null,
          requiredSkills: null,
          preferredSkills: null,
          requiredExperience: null,
          hiringStatus: '채용중',
          atsScore: null,
          atsFeedback: null,
          atsUpdatedAt: null,
        }
        setSubmissions((prev) => [optimistic, ...prev])
        setActiveId(result.jobId)
      }
      setView(VIEWS.list)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '알 수 없는 오류가 발생했습니다.'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async (formData) => {
    if (!editTarget) {
      return
    }
    setError('')
    setStatusMessage('')
    setIsLoading(true)
    try {
      await updateJobPostingApi(editTarget.id, formData)
      setStatusMessage('공고와 노션 페이지를 업데이트했습니다.')
      setEditTarget(null)
      setView(VIEWS.list)
      await fetchList()
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '알 수 없는 오류가 발생했습니다.'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const fetchList = async () => {
    setListError('')
    setListLoading(true)
    try {
      const list = await fetchJobPostingsApi()
      setSubmissions(list)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '리스트 조회 중 오류가 발생했습니다.'
      setListError(message)
    } finally {
      setListLoading(false)
    }
  }

  const handleAts = async (submission) => {
    setStatusMessage('')
    setListError('')
    try {
      await triggerAtsApi(submission.id)
      setStatusMessage('ATS 계산이 완료되었습니다. 리스트를 갱신했습니다.')
      await fetchList()
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'ATS 계산 중 오류가 발생했습니다.'
      setListError(message)
    }
  }

  const handleClose = async (submission) => {
    setStatusMessage('')
    setListError('')
    setListLoading(true)
    try {
      await closeJobPostingApi(submission.id)
      setStatusMessage('채용 종료로 변경했습니다.')
      await fetchList()
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '채용 종료 처리 중 오류가 발생했습니다.'
      setListError(message)
    } finally {
      setListLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchList()
  }

  const handleOpenNotion = (submission) => {
    setActiveId(submission.id)
    if (submission.notionUrl) {
      window.open(submission.notionUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleEdit = (submission) => {
    setEditTarget(submission)
    setView(VIEWS.form)
  }

  useEffect(() => {
    fetchList()
  }, [])

  const filteredSubmissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const matchesQuery = (submission) => {
      if (!query) return true
      return (
        submission.companyName?.toLowerCase().includes(query) ||
        submission.title?.toLowerCase().includes(query) ||
        submission.url?.toLowerCase().includes(query)
      )
    }

    const matchesStatus = (submission) => {
      if (!hideClosed) return true
      return submission.hiringStatus !== '종료'
    }

    const getDateValue = (submission) => {
      const raw = submission.postedAt || submission.submittedAt || submission.atsUpdatedAt
      if (!raw) return 0
      const date = new Date(raw)
      return Number.isNaN(date.getTime()) ? 0 : date.getTime()
    }


    return submissions
      .filter(
        (submission) => matchesQuery(submission) && matchesStatus(submission),
      )
      .sort((a, b) => {
        if (sortOrder === 'ats-high') {
          const leftScore = a.atsScore ?? -1
          const rightScore = b.atsScore ?? -1
          return rightScore - leftScore
        }
        const left = getDateValue(a)
        const right = getDateValue(b)
        return sortOrder === 'recent' ? right - left : left - right
      })
  }, [submissions, searchQuery, sortOrder, hideClosed])

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Resume + ATS Assistant</p>
          <h1>채용공고 리스트 관리</h1>
          <p className="subtitle">
            채용공고를 정리하고 ATS 분석까지 관리하는 작업 공간입니다.
          </p>
        </div>
        <div className="hero-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={handleRefresh}
            disabled={listLoading}
          >
            {listLoading ? '새로고침 중...' : '새로고침'}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setEditTarget(null)
              setView(VIEWS.form)
            }}
          >
            채용공고 입력
          </button>
        </div>
      </header>

      {view === VIEWS.list ? (
        <section className="section">
          <div className="section-header compact">
            <div>
              <h2>요약 리스트</h2>
              <p>필터/정렬로 빠르게 탐색하고 ATS를 관리하세요.</p>
            </div>
          </div>

          <div className="toolbar">
            <input
              className="toolbar-input"
              type="search"
              placeholder="회사명/직무/링크 검색"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <select
              className="toolbar-select"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            >
              <option value="recent">최근 순</option>
              <option value="oldest">오래된 순</option>
              <option value="ats-high">ATS 높은 순</option>
            </select>
            <label className="toolbar-checkbox">
              <input
                type="checkbox"
                checked={hideClosed}
                onChange={(event) => setHideClosed(event.target.checked)}
              />
              종료 숨기기
            </label>
          </div>

          {(statusMessage || listError) && (
            <div className="status-bar">
              {statusMessage && <span>{statusMessage}</span>}
              {listError && <span className="status-error">{listError}</span>}
            </div>
          )}
          <SummaryList
            submissions={filteredSubmissions}
            activeId={activeId}
            onOpen={handleOpenNotion}
            onAts={handleAts}
            onEdit={handleEdit}
            onClose={handleClose}
          />
        </section>
      ) : (
        <section className="section">
          <div className="section-header">
            <div>
              <h2>{editTarget ? '채용공고 수정' : '채용공고 입력'}</h2>
              <p>
                URL, 제목, 본문을 나누어 입력하세요.
                {editTarget ? ' 링크를 다시 가져와 업데이트할 수 있습니다.' : ''}
              </p>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setEditTarget(null)
                setView(VIEWS.list)
              }}
            >
              목록으로
            </button>
          </div>
          <JobForm
            onSubmit={editTarget ? handleUpdate : handleSubmit}
            isLoading={isLoading}
            initialValues={editTarget}
            mode={editTarget ? 'update' : 'create'}
          />
          {error && <div className="error-banner">{error}</div>}
        </section>
      )}
    </div>
  )
}

export default App
