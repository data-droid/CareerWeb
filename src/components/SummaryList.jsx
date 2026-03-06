import React, { useState } from 'react'

const formatDate = (value) => {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString('ko-KR')
}

const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('ko-KR')
}

const formatWorkType = (workType, hybridDaysOnsite) => {
  if (!workType) return '-'
  if (workType.toLowerCase() === 'hybrid' && hybridDaysOnsite) {
    return `Hybrid (${hybridDaysOnsite} days onsite)`
  }
  return workType
}

function SummaryList({ submissions, activeId, onOpen, onAts, onEdit, onClose }) {
  const [detailId, setDetailId] = useState(null)
  const [atsLoadingId, setAtsLoadingId] = useState(null)

  if (!submissions.length) {
    return (
      <div className="empty-card">
        아직 요약이 없습니다. 공고를 제출해 주세요.
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="summary-table">
        <thead>
          <tr>
            <th>회사명</th>
            <th>공고 제목</th>
            <th>공고 업로드일</th>
            <th>최신 수정일</th>
            <th>공고 링크</th>
            <th>노션 링크</th>
            <th>ATS 점수</th>
            <th>공고 수정</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => {
            const isDetailOpen = detailId === submission.id
            const isClosed = submission.hiringStatus === '종료'
            const isAtsLoading = atsLoadingId === submission.id
            return (
              <React.Fragment key={submission.id}>
                <tr
                  className={[
                    submission.id === activeId ? 'active' : '',
                    isClosed ? 'summary-row-closed' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <td>
                    <button
                      type="button"
                      className="link-button link-plain"
                      onClick={() =>
                        setDetailId(isDetailOpen ? null : submission.id)
                      }
                    >
                      {submission.companyName || '미정'}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="link-button link-plain"
                      onClick={() =>
                        setDetailId(isDetailOpen ? null : submission.id)
                      }
                    >
                      {submission.title}
                    </button>
                  </td>
                  <td>{formatDate(submission.postedAt || submission.submittedAt)}</td>
                  <td>
                    {formatDate(
                      submission.contentUpdatedAt ||
                        submission.createdAt ||
                        submission.postedAt,
                    )}
                  </td>
                  <td>
                    {submission.url ? (
                      <a
                        href={submission.url}
                        target="_blank"
                        rel="noreferrer"
                        className="table-link"
                      >
                        공고 링크
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {submission.notionUrl ? (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => onOpen(submission)}
                      >
                        노션 열기
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {submission.atsScore === null ||
                    submission.atsScore === undefined
                      ? '-'
                      : `${submission.atsScore}%`}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => onEdit(submission)}
                    >
                      수정
                    </button>
                  </td>
                </tr>
                {isDetailOpen && (
                  <tr className="detail-row">
                    <td colSpan={8}>
                      <div className="detail-card">
                        <div className="detail-grid">
                          <div className="detail-row-inline">
                            <div>
                              <span className="detail-label">포지션</span>
                              <p className="detail-value">
                                {submission.position || '-'}
                              </p>
                            </div>
                            <div>
                              <span className="detail-label">근무 형태</span>
                              <p className="detail-value">
                                {formatWorkType(
                                  submission.workType,
                                  submission.hybridDaysOnsite,
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="detail-label">연봉 범위</span>
                              <p className="detail-value">
                                {submission.salaryRange || '-'}
                              </p>
                            </div>
                            <div>
                              <span className="detail-label">경력</span>
                              <p className="detail-value">
                                {submission.requiredExperience || '-'}
                              </p>
                            </div>
                          </div>
                          <div>
                            <span className="detail-label">필수 스킬</span>
                            <p className="detail-value">
                              {submission.requiredSkills || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="detail-label">우대 스킬</span>
                            <p className="detail-value">
                              {submission.preferredSkills || '-'}
                            </p>
                          </div>
                          <div className="detail-divider" />
                          <div className="detail-ats">
                            <div className="detail-ats-header">
                              <strong>ATS 상세</strong>
                              <span>
                                업데이트:{' '}
                                {formatDateTime(submission.atsUpdatedAt)}
                              </span>
                            </div>
                            <pre className="detail-ats-body">
                              {submission.atsFeedback ||
                                '아직 ATS 분석 결과가 없습니다.'}
                            </pre>
                            <div className="detail-ats-actions">
                              <button
                                type="button"
                                className="ats-action-button"
                                onClick={async () => {
                                  if (isAtsLoading) return
                                  setAtsLoadingId(submission.id)
                                  const start = Date.now()
                                  try {
                                    await onAts(submission)
                                  } finally {
                                    const elapsed = Date.now() - start
                                    const remaining = Math.max(0, 3000 - elapsed)
                                    if (remaining) {
                                      await new Promise((resolve) =>
                                        setTimeout(resolve, remaining),
                                      )
                                    }
                                    setAtsLoadingId(null)
                                  }
                                }}
                                disabled={isAtsLoading}
                              >
                                {isAtsLoading ? '분석중...' : '재분석'}
                              </button>
                              <button
                                type="button"
                                className="ats-secondary-button"
                                onClick={() => onClose(submission)}
                                disabled={isClosed}
                              >
                                {isClosed ? '종료됨' : '채용 종료'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default SummaryList
