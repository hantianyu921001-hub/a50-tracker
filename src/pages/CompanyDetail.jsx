import { useScoring } from '../context/ScoringContext'
import CompanyDetailV20 from './CompanyDetailV20'
import CompanyDetailV22 from './CompanyDetailV22'

export default function CompanyDetail() {
  const { isV22 } = useScoring()
  return isV22 ? <CompanyDetailV22 /> : <CompanyDetailV20 />
}
